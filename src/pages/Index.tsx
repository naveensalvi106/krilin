import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Bot, LogOut, User, Mail, CalendarDays, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import StreakOrb from '@/components/StreakOrb';
import TaskCard from '@/components/TaskCard';
import AddTaskForm from '@/components/AddTaskForm';
import RevivalProtocol from '@/components/RevivalProtocol';
import Notepad from '@/components/Notepad';
import ChatWidget from '@/components/ChatWidget';
import StickerManager, { useStickers } from '@/components/StickerManager';
import { useTaskReminders } from '@/hooks/useTaskReminders';
import { usePushSubscription } from '@/hooks/usePushSubscription';

const Index = () => {
  const store = useAppStore();
  const { user, signOut } = useAuth();
  useTaskReminders(store.tasks);
  usePushSubscription();
  const { stickers, loading: stickersLoading, uploadSticker, deleteSticker } = useStickers();
  const [showProfile, setShowProfile] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dragOverId = useRef<string | null>(null);

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); dragOverId.current = id; };
  const handleDragEnd = () => {
    if (!draggedId || !dragOverId.current || draggedId === dragOverId.current) { setDraggedId(null); return; }
    const items = [...store.tasks];
    const fromIdx = items.findIndex(t => t.id === draggedId);
    const toIdx = items.findIndex(t => t.id === dragOverId.current);
    if (fromIdx === -1 || toIdx === -1) { setDraggedId(null); return; }
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    store.reorderTasks(items);
    setDraggedId(null);
    dragOverId.current = null;
  };

  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl border-b border-border" style={{ background: 'hsla(15, 5%, 4%, 0.85)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 relative">
            <button onClick={() => setShowProfile(!showProfile)} className="w-9 h-9 solid-circle hover:scale-110 transition-transform" title="Profile">
              <Zap className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-display text-gradient-fire">EasyFlow</h1>

            <AnimatePresence>
              {showProfile && (
                <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute top-12 left-0 z-50 w-72 rounded-2xl border border-border shadow-2xl overflow-hidden" style={{ background: 'hsl(15, 5%, 8%)' }}>
                  <div className="p-4 border-b border-border" style={{ background: 'hsl(15, 5%, 6%)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(30, 100%, 55%), hsl(5, 85%, 48%))' }}>
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{user?.user_metadata?.full_name || 'User'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 space-y-1">
                    {[
                      { icon: Mail, label: 'Email', value: user?.email },
                      { icon: CalendarDays, label: 'Member since', value: memberSince },
                      { icon: CheckCircle2, label: 'Tasks completed', value: `${store.completedCount} / ${store.totalCount}` },
                      { icon: Zap, label: "Today's progress", value: `${store.streakPercent}%` },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'hsl(15, 10%, 10%)' }}>
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-sm text-foreground truncate">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-border">
                    <StickerManager stickers={stickers} loading={stickersLoading} onUpload={uploadSticker} onDelete={deleteSticker} />
                  </div>
                  <div className="p-3 border-t border-border">
                    <button onClick={signOut} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm hover:scale-[1.02] transition-transform" style={{ background: 'hsl(0, 60%, 40%)' }}>
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowChat(true)} className="w-9 h-9 solid-circle hover:scale-110 transition-transform" title="AI Assistant">
              <Bot className="w-5 h-5" />
            </button>
            <Notepad />
          </div>
        </div>
      </div>

      {showProfile && <div className="fixed inset-0 z-30" onClick={() => setShowProfile(false)} />}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 min-h-[calc(100vh-80px)]">
        {(() => {
          const nextTask = store.tasks.find(t => !t.completed);
          const nextTaskSection = nextTask ? store.sections.find(s => s.id === nextTask.sectionId) : undefined;
          return (
            <StreakOrb percent={store.streakPercent} isGolden={store.isGolden} streak={store.currentStreak}
              completedCount={store.completedCount} totalCount={store.totalCount}
              nextTask={nextTask} nextTaskSection={nextTaskSection} />
          );
        })()}

        <AddTaskForm sections={store.sections} stickers={stickers} onAdd={store.addTask} />

        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h2 className="font-display text-sm text-gradient-fire">All Tasks</h2>
            <span className="text-xs text-muted-foreground">{store.completedCount}/{store.totalCount} done</span>
          </div>

          <div className="space-y-3">
            {store.tasks.length === 0 ? (
              <div className="glass-panel bevel p-8 text-center">
                <p className="text-muted-foreground text-sm">No tasks yet. Add your first task to start building your system.</p>
              </div>
            ) : (
              store.tasks.map(task => (
                <div key={task.id} draggable onDragStart={() => handleDragStart(task.id)} onDragOver={(e) => handleDragOver(e, task.id)} onDragEnd={handleDragEnd}
                  className={`transition-opacity ${draggedId === task.id ? 'opacity-50' : ''}`}>
                  <TaskCard
                    task={task}
                    section={store.sections.find(s => s.id === task.sectionId)}
                    onToggle={store.toggleTask}
                    onDelete={store.deleteTask}
                    onEdit={store.editTask}
                    onAddBandaid={store.addBandaid}
                    onRemoveBandaid={store.removeBandaid}
                    onAddProblem={store.addProblem}
                    onRemoveProblem={store.removeProblem}
                    visualizations={store.visualizations}
                    onAddVisualization={store.addVisualization}
                    onRemoveVisualization={store.removeVisualization}
                    isDragging={draggedId === task.id}
                    dragHandleProps={{}}
                    stickers={stickers}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <RevivalProtocol
          revivalVideos={store.revivalVideos} revivalSteps={store.revivalSteps}
          onAddVideo={store.addRevivalVideo} onRemoveVideo={store.removeRevivalVideo}
          onAddStep={store.addRevivalStep} onRemoveStep={store.removeRevivalStep}
        />
      </div>

      <ChatWidget open={showChat} onClose={() => setShowChat(false)} sections={store.sections} tasks={store.tasks}
        onAddTask={store.addTask} onToggleTask={store.toggleTask} onDeleteTask={store.deleteTask} />
    </div>
  );
};

export default Index;
