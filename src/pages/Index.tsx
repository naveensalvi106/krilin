import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, Plus, X, Sparkles, LogOut } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import StreakOrb from '@/components/StreakOrb';
import TaskCard from '@/components/TaskCard';
import AddTaskForm from '@/components/AddTaskForm';
import RevivalProtocol from '@/components/RevivalProtocol';
import SectionNav from '@/components/SectionNav';
import Notepad from '@/components/Notepad';
import { AnimatePresence } from 'framer-motion';
import { useTaskReminders } from '@/hooks/useTaskReminders';

const Index = () => {
  const store = useAppStore();
  const { signOut } = useAuth();
  useTaskReminders(store.tasks);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showVisSettings, setShowVisSettings] = useState(false);
  const [newVis, setNewVis] = useState('');

  const filteredTasks = useMemo(() => {
    if (!activeSection) return store.tasks;
    return store.tasks.filter(t => t.sectionId === activeSection);
  }, [store.tasks, activeSection]);

  const taskCounts = useMemo(() => {
    const counts: Record<string, { total: number; completed: number }> = {};
    store.tasks.forEach(t => {
      if (!counts[t.sectionId]) counts[t.sectionId] = { total: 0, completed: 0 };
      counts[t.sectionId].total++;
      if (t.completed) counts[t.sectionId].completed++;
    });
    return counts;
  }, [store.tasks]);

  const handleAddVis = () => {
    if (newVis.trim()) {
      store.addVisualization(newVis.trim());
      setNewVis('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl border-b border-border" style={{ background: 'hsla(15, 5%, 4%, 0.85)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 solid-circle">
              <Zap className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-display text-gradient-fire">EasyFlow</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowVisSettings(!showVisSettings)}
              className="w-9 h-9 solid-circle hover:scale-110 transition-transform"
              title="Edit Visualizations"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <button onClick={signOut} className="w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition-transform" style={{ background: 'hsl(0, 60%, 40%)' }}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Visualization Settings */}
        <AnimatePresence>
          {showVisSettings && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="glass-panel bevel p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm text-gradient-fire">✨ Visualizations</h3>
                  <button onClick={() => setShowVisSettings(false)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
                </div>
                <p className="text-xs text-muted-foreground">These appear when you complete a task.</p>
                <div className="space-y-1">
                  {store.visualizations.map(v => (
                    <div key={v.id} className="flex items-center gap-2 p-2 rounded-lg group" style={{ background: 'hsl(15, 10%, 10%)' }}>
                      <Sparkles className="w-3 h-3 icon-glow shrink-0" />
                      <span className="flex-1 text-sm">{v.text}</span>
                      <button onClick={() => store.removeVisualization(v.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={newVis} onChange={e => setNewVis(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddVis()} placeholder="Add a visualization message..." className="flex-1 bg-muted border border-border rounded-xl px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                  <button onClick={handleAddVis} className="w-8 h-8 solid-circle shrink-0 hover:scale-110 transition-transform"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <StreakOrb
          percent={store.streakPercent}
          isGolden={store.isGolden}
          streak={store.currentStreak}
          completedCount={store.completedCount}
          totalCount={store.totalCount}
        />

        <SectionNav
          sections={store.sections}
          activeSection={activeSection}
          onSelect={setActiveSection}
          taskCounts={taskCounts}
        />

        <AddTaskForm sections={store.sections} onAdd={store.addTask} />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm text-gradient-fire">
              {activeSection ? store.sections.find(s => s.id === activeSection)?.name : 'All Systems'}
            </h2>
            <span className="text-xs text-muted-foreground">{store.completedCount}/{store.totalCount} done</span>
          </div>

          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="glass-panel bevel p-8 text-center">
                <p className="text-muted-foreground text-sm">No tasks yet. Add your first task to start building your system.</p>
              </div>
            ) : (
              filteredTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  section={store.sections.find(s => s.id === task.sectionId)}
                  onToggle={store.toggleTask}
                  onDelete={store.deleteTask}
                  onAddBandaid={store.addBandaid}
                  onRemoveBandaid={store.removeBandaid}
                  onAddProblem={store.addProblem}
                  onRemoveProblem={store.removeProblem}
                  visualizations={store.visualizations}
                  onAddVisualization={store.addVisualization}
                  onRemoveVisualization={store.removeVisualization}
                />
              ))
            )}
          </div>
        </div>

        <RevivalProtocol
          revivalVideos={store.revivalVideos}
          revivalSteps={store.revivalSteps}
          onAddVideo={store.addRevivalVideo}
          onRemoveVideo={store.removeRevivalVideo}
          onAddStep={store.addRevivalStep}
          onRemoveStep={store.removeRevivalStep}
        />

        <div className="fixed bottom-6 right-6 z-40">
          <Notepad />
        </div>
      </div>
    </div>
  );
};

export default Index;
