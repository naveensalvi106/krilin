import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Json } from "@/integrations/supabase/types";
import { Capacitor } from "@capacitor/core";

// Helper to update native home screen widget with task list
const updateNativeWidget = (pendingTasks: Task[]) => {
  if (Capacitor.isNativePlatform()) {
    try {
      const count = pendingTasks.length;
      const taskList = pendingTasks
        .map(t => `• ${t.reminderTime ? t.reminderTime + ' ' : ''}${t.title}`)
        .join('\n');
      (Capacitor as any).Plugins.WidgetBridge?.updateWidget({ count, taskList }).catch(() => {});
    } catch (e) {
      console.warn('Widget update failed:', e);
    }
  }
};

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
  notificationMessage?: string;
  iconUrls: string[];
  createdAt: string;
  sortOrder: number;
  customSectionId?: string;
  taskDate: string;
}

export interface Section {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface CustomSection {
  id: string;
  name: string;
  iconUrl?: string;
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
  description: string;
}

export interface Visualization {
  id: string;
  text: string;
  image?: string;
  taskId?: string;
}

export interface TaskPreset {
  id: string;
  title: string;
  sectionId: string;
  reminderTime?: string;
  iconUrls: string[];
  bandaids: string[];
  problems: Problem[];
  visualizations: { text: string; image?: string }[];
}

export const DEFAULT_SECTIONS: Section[] = [
  { id: 'health', name: 'Diet', icon: 'Heart', color: '140 70% 45%' },
  { id: 'work', name: 'Work', icon: 'Laptop', color: '30 90% 50%' },
  { id: 'learning', name: 'Learning', icon: 'BookOpen', color: '200 80% 55%' },
  { id: 'social', name: 'Social', icon: 'MessageCircle', color: '280 70% 55%' },
  { id: 'fitness', name: 'Fitness', icon: 'Dumbbell', color: '210 10% 65%' },
];

interface AppData {
  tasks: Task[];
  sections: Section[];
  customSections: CustomSection[];
  streaks: DayStreak[];
  revivalVideos: RevivalVideo[];
  revivalSteps: RevivalStep[];
  visualizations: Visualization[];
  presets: TaskPreset[];
}

const EMPTY_DATA: AppData = {
  tasks: [],
  sections: DEFAULT_SECTIONS,
  customSections: [],
  streaks: [],
  revivalVideos: [],
  revivalSteps: [],
  visualizations: [],
  presets: [],
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
      const [tasksRes, sectionsRes, customSectionsRes, visRes, videosRes, stepsRes, presetsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('sections').select('*').eq('user_id', user.id),
        supabase.from('custom_sections' as any).select('*').eq('user_id', user.id),
        supabase.from('visualizations').select('*').eq('user_id', user.id),
        supabase.from('revival_videos').select('*').eq('user_id', user.id),
        supabase.from('revival_steps').select('*').eq('user_id', user.id).order('step'),
        supabase.from('task_presets' as any).select('*').eq('user_id', user.id),
      ]);

      const dbSections = (sectionsRes.data || []).map(s => ({
        id: s.id, name: s.name, icon: s.icon, color: s.color,
      }));

      const dbCustomSections = ((customSectionsRes.data as any[]) || []).map((cs: any) => ({
        id: cs.id, name: cs.name, iconUrl: cs.icon_url || undefined,
      }));

      setData({
        tasks: (tasksRes.data || []).map(t => {
          const raw = t as any;
          let iconUrls: string[] = [];
          if (raw.icon_urls && Array.isArray(raw.icon_urls) && raw.icon_urls.length > 0) {
            iconUrls = raw.icon_urls.filter(Boolean);
          } else if (raw.icon_url) {
            iconUrls = [raw.icon_url];
          }
          return {
            id: t.id, title: t.title, sectionId: t.section_id, completed: t.completed,
            bandaids: t.bandaids || [], problems: (t.problems as unknown as Problem[]) || [],
            reminderTime: t.reminder_time || undefined, notificationMessage: raw.notification_message || undefined,
            iconUrls, createdAt: t.created_at,
            sortOrder: raw.sort_order ?? 0, customSectionId: raw.custom_section_id || undefined,
            taskDate: raw.task_date || new Date().toISOString().split('T')[0],
          };
        }).sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return a.sortOrder - b.sortOrder;
        }),
        sections: dbSections.length > 0 ? dbSections : DEFAULT_SECTIONS,
        customSections: dbCustomSections,
        streaks: [],
        revivalVideos: (videosRes.data || []).map(v => ({ id: v.id, title: v.title, url: v.url, channel: v.channel })),
        revivalSteps: (stepsRes.data || []).map(s => ({ id: s.id, step: s.step, text: s.text, description: (s as any).description || '' })),
        visualizations: (visRes.data || []).map(v => ({ id: v.id, text: v.text, image: v.image || undefined, taskId: (v as any).task_id || undefined })),
        presets: ((presetsRes.data as any[]) || []).map((p: any) => ({
          id: p.id, title: p.title, sectionId: p.section_id, reminderTime: p.reminder_time || undefined,
          iconUrls: p.icon_urls || [], bandaids: p.bandaids || [], problems: (p.problems as unknown as Problem[]) || [],
          visualizations: (p.visualizations as any[]) || [],
        })),
      });
      setLoaded(true);
    };

    load();

    const channel = supabase
      .channel('app-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, () => { load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sections', filter: `user_id=eq.${user.id}` }, () => { load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_sections', filter: `user_id=eq.${user.id}` }, () => { load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visualizations', filter: `user_id=eq.${user.id}` }, () => { load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revival_videos', filter: `user_id=eq.${user.id}` }, () => { load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revival_steps', filter: `user_id=eq.${user.id}` }, () => { load(); })
      
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Sync widget with pending task details whenever tasks change
  useEffect(() => {
    if (loaded) {
      const pendingTasks = [...data.tasks]
        .filter(t => !t.completed)
        .sort((a, b) => {
          if (a.taskDate !== b.taskDate) return a.taskDate.localeCompare(b.taskDate);
          return a.sortOrder - b.sortOrder;
        });
      updateNativeWidget(pendingTasks);
    }
  }, [data.tasks, loaded]);

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

  // --- Main tasks (exclude custom section tasks) ---
  const mainTasks = data.tasks.filter(t => !t.customSectionId);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'completed' | 'createdAt'> & { taskDate?: string; problems?: Problem[] }): Promise<string | undefined> => {
    if (!user) return undefined;
    // Store reminder time as-is (local time, no UTC conversion)
    const reminderTimeToStore: string | null = task.reminderTime || null;
    
    // Auto-sort by reminder time: convert HH:mm to minutes for ordering
    // Tasks without reminder go to the end
    let newSortOrder: number;
    if (reminderTimeToStore) {
      const [hh, mm] = reminderTimeToStore.split(':').map(Number);
      const timeMinutes = hh * 60 + mm; // e.g. 06:00 = 360, 08:00 = 480, 14:00 = 840
      newSortOrder = timeMinutes;
    } else {
      const incompleteTasks = data.tasks.filter(t => !t.completed);
      const maxSortOrder = incompleteTasks.length > 0 ? Math.max(...incompleteTasks.map(t => t.sortOrder)) : -1;
      newSortOrder = Math.max(maxSortOrder + 1, 1440); // 1440 = after all timed tasks
    }
    const taskDate = task.taskDate || new Date().toISOString().split('T')[0];
    const problems = task.problems || [];
    const { data: inserted, error } = await supabase.from('tasks').insert({
      user_id: user.id, title: task.title, section_id: task.sectionId, bandaids: task.bandaids,
      reminder_time: reminderTimeToStore,
      icon_url: task.iconUrls?.[0] || null, icon_urls: task.iconUrls || [],
      problems: problems as unknown as Json, custom_section_id: task.customSectionId || null,
      sort_order: newSortOrder, task_date: taskDate,
    } as any).select().single();
    if (inserted && !error) {
      const raw = inserted as any;
      const newTask: Task = {
        id: inserted.id, title: inserted.title, sectionId: inserted.section_id, completed: inserted.completed,
        bandaids: inserted.bandaids || [], problems: (inserted.problems as unknown as Problem[]) || [],
        reminderTime: inserted.reminder_time || undefined,
        iconUrls: raw.icon_urls || (raw.icon_url ? [raw.icon_url] : []), createdAt: inserted.created_at,
        sortOrder: raw.sort_order ?? 0, customSectionId: raw.custom_section_id || undefined,
        taskDate: raw.task_date || taskDate,
      };
      setData(d => ({ ...d, tasks: [...d.tasks, newTask] }));
      return inserted.id;
    }
    return undefined;
  }, [user]);

  const toggleTask = useCallback(async (id: string) => {
    const task = data.tasks.find(t => t.id === id);
    if (!task) return;
    const newCompleted = !task.completed;
    await supabase.from('tasks').update({ completed: newCompleted }).eq('id', id);
    setData(d => {
      const updated = d.tasks.map(t => t.id === id ? { ...t, completed: newCompleted } : t);
      updated.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.sortOrder - b.sortOrder;
      });
      return { ...d, tasks: updated };
    });
  }, [data.tasks]);

  const deleteTask = useCallback(async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    setData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) }));
  }, []);

  const editTask = useCallback(async (id: string, updates: { title?: string; iconUrls?: string[]; reminderTime?: string | null; notificationMessage?: string | null }) => {
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.iconUrls !== undefined) {
      dbUpdates.icon_urls = updates.iconUrls;
      dbUpdates.icon_url = updates.iconUrls[0] || null;
    }
    if (updates.reminderTime !== undefined) {
      // Store as-is (local time, no UTC conversion)
      dbUpdates.reminder_time = updates.reminderTime || null;
    }
    await supabase.from('tasks').update(dbUpdates).eq('id', id);
    setData(d => ({
      ...d,
      tasks: d.tasks.map(t => t.id === id ? {
        ...t,
        ...updates,
      } : t),
    }));
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

  // --- Custom Sections ---
  const addCustomSection = useCallback(async (name: string, iconUrl?: string) => {
    if (!user) return;
    const { data: inserted } = await supabase.from('custom_sections' as any).insert({
      user_id: user.id, name, icon_url: iconUrl || null,
    } as any).select().single();
    if (inserted) {
      const cs = inserted as any;
      setData(d => ({ ...d, customSections: [...d.customSections, { id: cs.id, name: cs.name, iconUrl: cs.icon_url || undefined }] }));
    }
  }, [user]);

  const editCustomSection = useCallback(async (id: string, updates: { name?: string; iconUrl?: string }) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.iconUrl !== undefined) dbUpdates.icon_url = updates.iconUrl;
    await supabase.from('custom_sections' as any).update(dbUpdates).eq('id', id);
    setData(d => ({
      ...d, customSections: d.customSections.map(cs => cs.id === id ? { ...cs, ...updates } : cs),
    }));
  }, []);

  const deleteCustomSection = useCallback(async (id: string) => {
    // Tasks will be cascade deleted
    await supabase.from('custom_sections' as any).delete().eq('id', id);
    setData(d => ({
      ...d,
      customSections: d.customSections.filter(cs => cs.id !== id),
      tasks: d.tasks.filter(t => t.customSectionId !== id),
    }));
  }, []);

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

  const addRevivalStep = useCallback(async (text: string, description?: string) => {
    if (!user) return;
    const step = data.revivalSteps.length + 1;
    const { data: inserted } = await supabase.from('revival_steps').insert({ user_id: user.id, step, text, description: description || '' } as any).select().single();
    if (inserted) {
      const s = inserted as any;
      setData(d => ({ ...d, revivalSteps: [...d.revivalSteps, { id: s.id, step: s.step, text: s.text, description: s.description || '' }] }));
    }
  }, [user, data.revivalSteps.length]);

  const reorderRevivalSteps = useCallback(async (reordered: RevivalStep[]) => {
    const updated = reordered.map((s, i) => ({ ...s, step: i + 1 }));
    setData(d => ({ ...d, revivalSteps: updated }));
    for (const s of updated) {
      supabase.from('revival_steps').update({ step: s.step } as any).eq('id', s.id).then();
    }
  }, []);

  const updateRevivalStep = useCallback(async (id: string, updates: { text?: string; description?: string }) => {
    const dbUpdates: any = {};
    if (updates.text !== undefined) dbUpdates.text = updates.text;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    await supabase.from('revival_steps').update(dbUpdates as any).eq('id', id);
    setData(d => ({
      ...d, revivalSteps: d.revivalSteps.map(s => s.id === id ? { ...s, ...updates } : s),
    }));
  }, []);

  const removeRevivalStep = useCallback(async (id: string) => {
    await supabase.from('revival_steps').delete().eq('id', id);
    setData(d => {
      const filtered = d.revivalSteps.filter(s => s.id !== id).map((s, i) => ({ ...s, step: i + 1 }));
      filtered.forEach(s => supabase.from('revival_steps').update({ step: s.step }).eq('id', s.id));
      return { ...d, revivalSteps: filtered };
    });
  }, []);

  const addVisualization = useCallback(async (text: string, image?: string, taskId?: string) => {
    if (!user) return;
    const { data: inserted } = await supabase.from('visualizations').insert({
      user_id: user.id, text, image: image || null, task_id: taskId || null,
    } as any).select().single();
    if (inserted) {
      setData(d => ({ ...d, visualizations: [...d.visualizations, { id: inserted.id, text: inserted.text, image: inserted.image || undefined, taskId: (inserted as any).task_id || undefined }] }));
    }
  }, [user]);

  const removeVisualization = useCallback(async (id: string) => {
    await supabase.from('visualizations').delete().eq('id', id);
    setData(d => ({ ...d, visualizations: d.visualizations.filter(v => v.id !== id) }));
  }, []);

  const reorderTasks = useCallback(async (reorderedTasks: Task[]) => {
    const updated = reorderedTasks.map((t, i) => ({ ...t, sortOrder: i }));
    updated.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.sortOrder - b.sortOrder;
    });
    setData(d => ({ ...d, tasks: updated }));
    for (const t of updated) {
      supabase.from('tasks').update({ sort_order: t.sortOrder } as any).eq('id', t.id).then();
    }
  }, []);

  // --- Presets ---
  const savePreset = useCallback(async (preset: Omit<TaskPreset, 'id'>) => {
    if (!user) return;
    const { data: inserted } = await supabase.from('task_presets' as any).insert({
      user_id: user.id, title: preset.title, section_id: preset.sectionId,
      reminder_time: preset.reminderTime || null, icon_urls: preset.iconUrls || [],
      bandaids: preset.bandaids || [], problems: (preset.problems || []) as unknown as Json,
      visualizations: (preset.visualizations || []) as unknown as Json,
    } as any).select().single();
    if (inserted) {
      const p = inserted as any;
      setData(d => ({ ...d, presets: [...d.presets, { id: p.id, title: p.title, sectionId: p.section_id, reminderTime: p.reminder_time || undefined, iconUrls: p.icon_urls || [], bandaids: p.bandaids || [], problems: (p.problems as unknown as Problem[]) || [], visualizations: (p.visualizations as any[]) || [] }] }));
    }
  }, [user]);

  const deletePreset = useCallback(async (id: string) => {
    await supabase.from('task_presets' as any).delete().eq('id', id);
    setData(d => ({ ...d, presets: d.presets.filter(p => p.id !== id) }));
  }, []);

  // Streak only counts main tasks (not custom section tasks)
  const today = new Date().toISOString().split('T')[0];
  const completedCount = mainTasks.filter(t => t.completed).length;
  const totalCount = mainTasks.length;
  const streakPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isGolden = streakPercent === 100 && totalCount > 0;
  // Streak = days since April 1, 2026
  const startDate = new Date(2026, 3, 1); // April 1, 2026
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const currentStreak = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);

  return {
    tasks: mainTasks,
    allTasks: data.tasks,
    sections: data.sections,
    customSections: data.customSections,
    streaks: data.streaks,
    revivalVideos: data.revivalVideos,
    revivalSteps: data.revivalSteps,
    visualizations: data.visualizations,
    presets: data.presets,
    addTask, toggleTask, deleteTask, editTask, addSection,
    addCustomSection, editCustomSection, deleteCustomSection,
    addBandaid, removeBandaid, addProblem, removeProblem,
    addRevivalVideo, removeRevivalVideo, addRevivalStep, removeRevivalStep, reorderRevivalSteps, updateRevivalStep,
    addVisualization, removeVisualization, reorderTasks,
    savePreset, deletePreset,
    today, completedCount, totalCount, streakPercent, isGolden, currentStreak, loaded,
  };
}
