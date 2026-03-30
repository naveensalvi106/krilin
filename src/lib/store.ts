import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Json } from "@/integrations/supabase/types";

export interface Problem {
  id: string;
  title: string;
  solution: string;
}

export interface Task {
  id: string;
  title: string;
  sectionId: string;
  completed: boolean;
  bandaids: string[];
  problems: Problem[];
  reminderTime?: string;
  createdAt: string;
  sortOrder: number;
}

export interface Section {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface DayStreak {
  date: string;
  totalTasks: number;
  completedTasks: number;
  isGolden: boolean;
}

export interface RevivalVideo {
  id: string;
  title: string;
  url: string;
  channel: string;
}

export interface RevivalStep {
  id: string;
  step: number;
  text: string;
}

export interface Visualization {
  id: string;
  text: string;
  image?: string;
}

export const DEFAULT_SECTIONS: Section[] = [
  { id: 'health', name: 'Health', icon: 'Heart', color: '0 85% 55%' },
  { id: 'work', name: 'Work', icon: 'Laptop', color: '30 90% 50%' },
  { id: 'learning', name: 'Learning', icon: 'BookOpen', color: '200 80% 55%' },
  { id: 'social', name: 'Social', icon: 'MessageCircle', color: '280 70% 55%' },
  { id: 'fitness', name: 'Fitness', icon: 'Dumbbell', color: '120 60% 45%' },
];

interface AppData {
  tasks: Task[];
  sections: Section[];
  streaks: DayStreak[];
  revivalVideos: RevivalVideo[];
  revivalSteps: RevivalStep[];
  visualizations: Visualization[];
}

const EMPTY_DATA: AppData = {
  tasks: [],
  sections: DEFAULT_SECTIONS,
  streaks: [],
  revivalVideos: [],
  revivalSteps: [],
  visualizations: [],
};

export function useAppStore() {
  const { user } = useAuth();
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setData(EMPTY_DATA);
      setLoaded(false);
      return;
    }

    const load = async () => {
      const [tasksRes, sectionsRes, visRes, videosRes, stepsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('sections').select('*').eq('user_id', user.id),
        supabase.from('visualizations').select('*').eq('user_id', user.id),
        supabase.from('revival_videos').select('*').eq('user_id', user.id),
        supabase.from('revival_steps').select('*').eq('user_id', user.id).order('step'),
      ]);

      const dbSections = (sectionsRes.data || []).map(s => ({
        id: s.id,
        name: s.name,
        icon: s.icon,
        color: s.color,
      }));

      setData({
        tasks: (tasksRes.data || []).map(t => ({
          id: t.id,
          title: t.title,
          sectionId: t.section_id,
          completed: t.completed,
          bandaids: t.bandaids || [],
          problems: (t.problems as unknown as Problem[]) || [],
          reminderTime: t.reminder_time || undefined,
          createdAt: t.created_at,
          sortOrder: (t as any).sort_order ?? 0,
        })).sort((a, b) => a.sortOrder - b.sortOrder),
        sections: dbSections.length > 0 ? dbSections : DEFAULT_SECTIONS,
        streaks: [],
        revivalVideos: (videosRes.data || []).map(v => ({
          id: v.id,
          title: v.title,
          url: v.url,
          channel: v.channel,
        })),
        revivalSteps: (stepsRes.data || []).map(s => ({
          id: s.id,
          step: s.step,
          text: s.text,
        })),
        visualizations: (visRes.data || []).map(v => ({
          id: v.id,
          text: v.text,
          image: v.image || undefined,
        })),
      });
      setLoaded(true);
    };

    load();
  }, [user]);

  useEffect(() => {
    if (!user || !loaded) return;
    const seedSections = async () => {
      const { count } = await supabase.from('sections').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      if (count === 0) {
        const rows = DEFAULT_SECTIONS.map(s => ({ user_id: user.id, name: s.name, icon: s.icon, color: s.color }));
        const { data: inserted } = await supabase.from('sections').insert(rows).select();
        if (inserted) {
          setData(d => ({ ...d, sections: inserted.map(s => ({ id: s.id, name: s.name, icon: s.icon, color: s.color })) }));
        }
      }
    };
    seedSections();
  }, [user, loaded]);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'completed' | 'createdAt' | 'problems'>) => {
    if (!user) return;
    // Convert local reminder time to UTC for server-side matching
    let utcReminderTime: string | null = null;
    if (task.reminderTime) {
      const [h, m] = task.reminderTime.split(':').map(Number);
      const now = new Date();
      now.setHours(h, m, 0, 0);
      utcReminderTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
    }
    const { data: inserted, error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: task.title,
      section_id: task.sectionId,
      bandaids: task.bandaids,
      reminder_time: utcReminderTime,
      problems: [] as unknown as Json,
    }).select().single();
    if (inserted && !error) {
      const newTask: Task = {
        id: inserted.id,
        title: inserted.title,
        sectionId: inserted.section_id,
        completed: inserted.completed,
        bandaids: inserted.bandaids || [],
        problems: [],
        reminderTime: inserted.reminder_time || undefined,
        createdAt: inserted.created_at,
        sortOrder: (inserted as any).sort_order ?? 0,
      };
      setData(d => ({ ...d, tasks: [...d.tasks, newTask] }));
    }
  }, [user]);

  const toggleTask = useCallback(async (id: string) => {
    const task = data.tasks.find(t => t.id === id);
    if (!task) return;
    await supabase.from('tasks').update({ completed: !task.completed }).eq('id', id);
    setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t) }));
  }, [data.tasks]);

  const deleteTask = useCallback(async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    setData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) }));
  }, []);

  const addSection = useCallback(async (section: Omit<Section, 'id'>) => {
    if (!user) return;
    const { data: inserted } = await supabase.from('sections').insert({
      user_id: user.id, name: section.name, icon: section.icon, color: section.color,
    }).select().single();
    if (inserted) {
      setData(d => ({ ...d, sections: [...d.sections, { id: inserted.id, name: inserted.name, icon: inserted.icon, color: inserted.color }] }));
    }
  }, [user]);

  const addBandaid = useCallback(async (taskId: string, bandaid: string) => {
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return;
    const newBandaids = [...task.bandaids, bandaid];
    await supabase.from('tasks').update({ bandaids: newBandaids }).eq('id', taskId);
    setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === taskId ? { ...t, bandaids: newBandaids } : t) }));
  }, [data.tasks]);

  const removeBandaid = useCallback(async (taskId: string, index: number) => {
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return;
    const newBandaids = task.bandaids.filter((_, i) => i !== index);
    await supabase.from('tasks').update({ bandaids: newBandaids }).eq('id', taskId);
    setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === taskId ? { ...t, bandaids: newBandaids } : t) }));
  }, [data.tasks]);

  const addProblem = useCallback(async (taskId: string, title: string, solution: string) => {
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return;
    const newProblems = [...task.problems, { id: crypto.randomUUID(), title, solution }];
    await supabase.from('tasks').update({ problems: newProblems as unknown as Json }).eq('id', taskId);
    setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === taskId ? { ...t, problems: newProblems } : t) }));
  }, [data.tasks]);

  const removeProblem = useCallback(async (taskId: string, problemId: string) => {
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return;
    const newProblems = task.problems.filter(p => p.id !== problemId);
    await supabase.from('tasks').update({ problems: newProblems as unknown as Json }).eq('id', taskId);
    setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === taskId ? { ...t, problems: newProblems } : t) }));
  }, [data.tasks]);

  const addRevivalVideo = useCallback(async (video: Omit<RevivalVideo, 'id'>) => {
    if (!user) return;
    const { data: inserted } = await supabase.from('revival_videos').insert({
      user_id: user.id, title: video.title, url: video.url, channel: video.channel,
    }).select().single();
    if (inserted) {
      setData(d => ({ ...d, revivalVideos: [...d.revivalVideos, { id: inserted.id, title: inserted.title, url: inserted.url, channel: inserted.channel }] }));
    }
  }, [user]);

  const removeRevivalVideo = useCallback(async (id: string) => {
    await supabase.from('revival_videos').delete().eq('id', id);
    setData(d => ({ ...d, revivalVideos: d.revivalVideos.filter(v => v.id !== id) }));
  }, []);

  const addRevivalStep = useCallback(async (text: string) => {
    if (!user) return;
    const step = data.revivalSteps.length + 1;
    const { data: inserted } = await supabase.from('revival_steps').insert({
      user_id: user.id, step, text,
    }).select().single();
    if (inserted) {
      setData(d => ({ ...d, revivalSteps: [...d.revivalSteps, { id: inserted.id, step: inserted.step, text: inserted.text }] }));
    }
  }, [user, data.revivalSteps.length]);

  const removeRevivalStep = useCallback(async (id: string) => {
    await supabase.from('revival_steps').delete().eq('id', id);
    setData(d => {
      const filtered = d.revivalSteps.filter(s => s.id !== id).map((s, i) => ({ ...s, step: i + 1 }));
      filtered.forEach(s => supabase.from('revival_steps').update({ step: s.step }).eq('id', s.id));
      return { ...d, revivalSteps: filtered };
    });
  }, []);

  const addVisualization = useCallback(async (text: string, image?: string) => {
    if (!user) return;
    const { data: inserted } = await supabase.from('visualizations').insert({
      user_id: user.id, text, image: image || null,
    }).select().single();
    if (inserted) {
      setData(d => ({ ...d, visualizations: [...d.visualizations, { id: inserted.id, text: inserted.text, image: inserted.image || undefined }] }));
    }
  }, [user]);

  const removeVisualization = useCallback(async (id: string) => {
    await supabase.from('visualizations').delete().eq('id', id);
    setData(d => ({ ...d, visualizations: d.visualizations.filter(v => v.id !== id) }));
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const completedCount = data.tasks.filter(t => t.completed).length;
  const totalCount = data.tasks.length;
  const streakPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isGolden = streakPercent === 100 && totalCount > 0;
  const currentStreak = Math.max(streakPercent > 0 ? 1 : 0, 1);

  return {
    tasks: data.tasks,
    sections: data.sections,
    streaks: data.streaks,
    revivalVideos: data.revivalVideos,
    revivalSteps: data.revivalSteps,
    visualizations: data.visualizations,
    addTask,
    toggleTask,
    deleteTask,
    addSection,
    addBandaid,
    removeBandaid,
    addProblem,
    removeProblem,
    addRevivalVideo,
    removeRevivalVideo,
    addRevivalStep,
    removeRevivalStep,
    addVisualization,
    removeVisualization,
    today,
    completedCount,
    totalCount,
    streakPercent,
    isGolden,
    currentStreak,
    loaded,
  };
}
