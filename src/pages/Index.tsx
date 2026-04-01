import React, { useState, useRef, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CalendarDays as CalendarIcon, LogOut, User, Mail, CalendarDays, CheckCircle2, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import StreakOrb from '@/components/StreakOrb';
import TaskCard from '@/components/TaskCard';
import AddTaskForm from '@/components/AddTaskForm';
import StickerManager, { useStickers } from '@/components/StickerManager';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useTaskReminders } from '@/hooks/useTaskReminders';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { playTab, playOpen, playClick, playDelete, playAddTask, playClose } from '@/lib/sounds';

const RevivalProtocol = lazy(() => import('@/components/RevivalProtocol'));
const Notepad = lazy(() => import('@/components/Notepad'));
const CalendarWidget = lazy(() => import('@/components/CalendarWidget'));

const Index = () => {
  const store = useAppStore();
  const { user, signOut } = useAuth();
  useTaskReminders(store.tasks);
  usePushSubscription();
  const { stickers, loading: stickersLoading, uploadSticker, deleteSticker } = useStickers();
  const [showProfile, setShowProfile] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dragOverId = useRef<string | null>(null);

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [confirmDeleteSection, setConfirmDeleteSection] = useState<string | null>(null);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isViewingToday = selectedDateStr === todayStr;

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); dragOverId.current = id; };
  const handleDragEnd = () => {
    if (!draggedId || !dragOverId.current || draggedId === dragOverId.current) { setDraggedId(null); return; }
    const currentTasks = activeTab
      ? store.allTasks.filter(t => t.customSectionId === activeTab && t.taskDate === selectedDateStr).sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return a.sortOrder - b.sortOrder;
        })
      : store.allTasks.filter(t => !t.customSectionId && t.taskDate === selectedDateStr).sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return a.sortOrder - b.sortOrder;
        });
    const items = [...currentTasks];
    const fromIdx = items.findIndex(t => t.id === draggedId);
    const toIdx = items.findIndex(t => t.id === dragOverId.current);
    if (fromIdx === -1 || toIdx === -1) { setDraggedId(null); return; }
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    store.reorderTasks(items);
    setDraggedId(null);
    dragOverId.current = null;
  };

  const handleCreateSection = () => {
    if (!newSectionName.trim()) return;
    store.addCustomSection(newSectionName.trim());
    setNewSectionName('');
    setShowAddSection(false);
  };

  // Filter tasks by selected date
  const dateFilteredMainTasks = store.allTasks.filter(t => !t.customSectionId && t.taskDate === selectedDateStr).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.sortOrder - b.sortOrder;
  });

  const sectionTasks = activeTab
    ? store.allTasks.filter(t => t.customSectionId === activeTab && t.taskDate === selectedDateStr).sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.sortOrder - b.sortOrder;
      })
    : dateFilteredMainTasks;

  const sectionCompletedCount = sectionTasks.filter(t => t.completed).length;
  const sectionTotalCount = sectionTasks.length;

  // Task count by date for calendar dots
  const taskCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of store.allTasks) {
      if (t.taskDate) {
        counts[t.taskDate] = (counts[t.taskDate] || 0) + 1;
      }
    }
    return counts;
  }, [store.allTasks]);

  const handleAddTask = (task: { title: string; sectionId: string; bandaids: string[]; reminderTime?: string; iconUrls: string[]; sortOrder: number }) => {
    if (activeTab) {
      store.addTask({ ...task, customSectionId: activeTab, taskDate: selectedDateStr });
    } else {
      store.addTask({ ...task, taskDate: selectedDateStr });
    }
  };

  // Streak only considers today's main tasks
  const todayMainTasks = store.allTasks.filter(t => !t.customSectionId && t.taskDate === todayStr);
  const todayCompleted = todayMainTasks.filter(t => t.completed).length;
  const todayTotal = todayMainTasks.length;
  const streakPercent = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;
  const isGolden = streakPercent === 100 && todayTotal > 0;

  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl border-b border-border" style={{ background: 'hsla(15, 5%, 4%, 0.85)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 relative">
            <button onClick={() => { setShowProfile(!showProfile); showProfile ? playClose() : playOpen(); }} className="w-9 h-9 solid-circle hover:scale-110 transition-transform" title="Profile">
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
                      { icon: CheckCircle2, label: 'Tasks completed', value: `${todayCompleted} / ${todayTotal}` },
                      { icon: Zap, label: "Today's progress", value: `${streakPercent}%` },
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
            <button
              onClick={() => { setShowCalendar(true); playOpen(); }}
              className="w-9 h-9 solid-circle hover:scale-110 transition-transform relative"
              title="Calendar"
              style={!isViewingToday ? {
                background: 'linear-gradient(135deg, hsl(30, 100%, 55%), hsl(15, 90%, 45%))',
                boxShadow: '0 0 10px hsl(25, 100%, 50% / 0.4)',
              } : undefined}
            >
              <CalendarIcon className="w-5 h-5" />
              {!isViewingToday && (
                <span className="absolute -bottom-0.5 text-[8px] font-bold text-white">{format(selectedDate, 'd')}</span>
              )}
            </button>
            <Suspense fallback={null}>
              <Notepad />
            </Suspense>
          </div>
        </div>
      </div>

      {showProfile && <div className="fixed inset-0 z-30" onClick={() => setShowProfile(false)} />}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 min-h-[calc(100vh-80px)]">
        {/* Date indicator when not viewing today */}
        {!isViewingToday && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between rounded-xl px-4 py-2"
            style={{
              background: 'linear-gradient(135deg, hsl(20, 30%, 12%), hsl(15, 20%, 8%))',
              border: '1px solid hsl(20, 60%, 30%)',
            }}
          >
            <span className="text-sm font-display text-gradient-fire">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </span>
            <button
              onClick={() => { setSelectedDate(new Date()); playTab(); }}
              className="text-xs px-3 py-1 rounded-full font-medium text-primary-foreground"
              style={{
                background: 'linear-gradient(135deg, hsl(30, 100%, 55%), hsl(15, 90%, 45%))',
              }}
            >
              Today
            </button>
          </motion.div>
        )}

        {activeTab === null && (() => {
          const nextTask = dateFilteredMainTasks.find(t => !t.completed);
          const nextTaskSection = nextTask ? store.sections.find(s => s.id === nextTask.sectionId) : undefined;
          return (
            <StreakOrb percent={isViewingToday ? streakPercent : (sectionTotalCount > 0 ? Math.round((sectionCompletedCount / sectionTotalCount) * 100) : 0)}
              isGolden={isViewingToday ? isGolden : (sectionCompletedCount === sectionTotalCount && sectionTotalCount > 0)}
              streak={store.currentStreak}
              completedCount={isViewingToday ? todayCompleted : sectionCompletedCount}
              totalCount={isViewingToday ? todayTotal : sectionTotalCount}
              nextTask={nextTask} nextTaskSection={nextTaskSection} />
          );
        })()}

        <AddTaskForm sections={store.sections} stickers={stickers} presets={store.presets} onAdd={handleAddTask} onDeletePreset={store.deletePreset} />

        <div className="space-y-3">
          <div className="flex items-center gap-0 overflow-x-auto pb-1 scrollbar-none">
            <h2
              className={`font-display text-sm whitespace-nowrap shrink-0 cursor-pointer px-2 py-1 transition-colors ${activeTab === null ? 'text-gradient-fire border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => { setActiveTab(null); playTab(); }}
            >
              All Tasks
            </h2>

            {store.customSections.map((cs) => (
              <React.Fragment key={cs.id}>
                <div className="w-px h-4 shrink-0" style={{ background: 'hsl(var(--border))' }} />
                <div className="flex items-center gap-1 shrink-0">
                  <h2
                    className={`font-display text-sm whitespace-nowrap cursor-pointer px-2 py-1 transition-colors ${cs.id === activeTab ? 'text-gradient-fire border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => { setActiveTab(cs.id); playTab(); }}
                  >
                    {cs.name}
                  </h2>
                  {cs.id === activeTab && (
                    <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteSection(cs.id); playClick(); }}
                      className="w-4 h-4 rounded-full flex items-center justify-center hover:scale-125 transition-transform"
                      style={{ background: 'hsl(0 60% 40%)' }}
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  )}
                </div>
              </React.Fragment>
            ))}

            <div className="w-px h-4 shrink-0" style={{ background: 'hsl(var(--border))' }} />

            {showAddSection ? (
              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                <input
                  autoFocus
                  value={newSectionName}
                  onChange={e => setNewSectionName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateSection(); if (e.key === 'Escape') { setShowAddSection(false); setNewSectionName(''); } }}
                  placeholder="Section name..."
                  className="w-28 bg-transparent border-b border-primary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none px-1 py-0.5"
                />
                <button onClick={() => { handleCreateSection(); playAddTask(); }} className="text-xs text-primary font-medium hover:scale-105 transition-transform">Add</button>
                <button onClick={() => { setShowAddSection(false); setNewSectionName(''); }} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>
            ) : (
              <button
                onClick={() => { setShowAddSection(true); playOpen(); }}
                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 hover:scale-110 transition-transform ml-1"
                style={{
                  background: 'linear-gradient(135deg, hsl(45, 100%, 55%), hsl(25, 100%, 50%))',
                  boxShadow: '0 0 8px hsl(35 100% 50% / 0.3)',
                }}
                title="Add Section"
              >
                <Plus className="w-3 h-3 text-white" />
              </button>
            )}

            <span className="text-xs text-muted-foreground ml-auto shrink-0">{sectionCompletedCount}/{sectionTotalCount} done</span>
          </div>

          <div className="space-y-3">
            {sectionTasks.length === 0 ? (
              <div className="glass-panel bevel p-8 text-center">
                <p className="text-muted-foreground text-sm">
                  {!isViewingToday
                    ? `No tasks planned for ${format(selectedDate, 'MMMM d')}. Add tasks to plan ahead!`
                    : activeTab ? 'No tasks in this section yet. Add one above!' : 'No tasks yet. Add your first task to start building your system.'}
                </p>
              </div>
            ) : (
              sectionTasks.map(task => (
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

        {activeTab === null && (
          <Suspense fallback={null}>
            <RevivalProtocol
              revivalVideos={store.revivalVideos} revivalSteps={store.revivalSteps}
              onAddVideo={store.addRevivalVideo} onRemoveVideo={store.removeRevivalVideo}
              onAddStep={store.addRevivalStep} onRemoveStep={store.removeRevivalStep}
            />
          </Suspense>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDeleteSection}
        onConfirm={() => {
          if (confirmDeleteSection) {
            store.deleteCustomSection(confirmDeleteSection); playDelete();
            if (activeTab === confirmDeleteSection) setActiveTab(null);
          }
          setConfirmDeleteSection(null);
        }}
        onCancel={() => setConfirmDeleteSection(null)}
        title="Delete Section?"
        description="This will delete the section and all its tasks. Are you sure?"
      />

      <Suspense fallback={null}>
        <CalendarWidget
          open={showCalendar}
          onClose={() => { setShowCalendar(false); playClose(); }}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          taskCountByDate={taskCountByDate}
        />
      </Suspense>
    </div>
  );
};

export default Index;
