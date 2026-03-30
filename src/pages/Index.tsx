import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Bot, LogOut, User, Mail, CalendarDays, CheckCircle2, Plus, ChevronLeft, Pencil, ImagePlus, X, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import StreakOrb from '@/components/StreakOrb';
import TaskCard from '@/components/TaskCard';
import AddTaskForm from '@/components/AddTaskForm';
import RevivalProtocol from '@/components/RevivalProtocol';
import Notepad from '@/components/Notepad';
import ChatWidget from '@/components/ChatWidget';
import StickerManager, { useStickers } from '@/components/StickerManager';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useTaskReminders } from '@/hooks/useTaskReminders';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SECTION_COLORS = [
  '45 95% 50%', '200 80% 50%', '280 70% 50%', '120 65% 45%', '340 75% 55%',
  '170 70% 45%', '25 90% 55%', '260 65% 55%', '60 80% 45%', '310 60% 50%',
];

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

  // Tab state: null = "All Tasks", string = custom section id
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionIcon, setNewSectionIcon] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [confirmDeleteSection, setConfirmDeleteSection] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  // Touch swipe
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

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

  // Swipe navigation
  const allTabs = [null, ...store.customSections.map(cs => cs.id)];
  const currentTabIndex = allTabs.indexOf(activeTab);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => { touchEndX.current = e.touches[0].clientX; };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 60) {
      if (diff > 0 && currentTabIndex < allTabs.length - 1) {
        setActiveTab(allTabs[currentTabIndex + 1]);
      } else if (diff < 0 && currentTabIndex > 0) {
        setActiveTab(allTabs[currentTabIndex - 1]);
      }
    }
  };

  // Section helpers
  const uploadIcon = async (file: File): Promise<string | null> => {
    if (!user) return null;
    if (file.size > 2 * 1024 * 1024) { toast.error('Max 2MB'); return null; }
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const { error } = await supabase.storage.from('section-icons').upload(`${user.id}/${safeName}`, file, { contentType: file.type });
    if (error) { toast.error('Upload failed'); return null; }
    return supabase.storage.from('section-icons').getPublicUrl(`${user.id}/${safeName}`).data.publicUrl;
  };

  const handleCreateSection = async () => {
    if (!newSectionName.trim()) return;
    store.addCustomSection(newSectionName.trim(), newSectionIcon || undefined);
    setNewSectionName('');
    setNewSectionIcon(null);
    setShowAddSection(false);
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadIcon(file);
    if (url) setNewSectionIcon(url);
    setUploading(false);
    e.target.value = '';
  };

  const handleEditIconUpload = async (e: React.ChangeEvent<HTMLInputElement>, sectionId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadIcon(file);
    if (url) store.editCustomSection(sectionId, { iconUrl: url });
    setUploading(false);
    e.target.value = '';
  };

  const handleAddTaskToSection = (sectionId: string) => {
    if (!newTaskTitle.trim()) return;
    store.addTask({
      title: newTaskTitle.trim(), sectionId: 'custom', bandaids: [], iconUrls: [], sortOrder: 0, customSectionId: sectionId,
    });
    setNewTaskTitle('');
  };

  const activeCustomSection = store.customSections.find(cs => cs.id === activeTab);
  const activeSectionTasks = activeTab
    ? store.allTasks.filter(t => t.customSectionId === activeTab).sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.sortOrder - b.sortOrder;
      })
    : [];
  const activeSectionIdx = store.customSections.findIndex(cs => cs.id === activeTab);
  const activeSectionColor = activeTab ? SECTION_COLORS[activeSectionIdx % SECTION_COLORS.length] : '';

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

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6"
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      >
        {/* StreakOrb - only on All Tasks tab */}
        {activeTab === null && (() => {
          const nextTask = store.tasks.find(t => !t.completed);
          const nextTaskSection = nextTask ? store.sections.find(s => s.id === nextTask.sectionId) : undefined;
          return (
            <StreakOrb percent={store.streakPercent} isGolden={store.isGolden} streak={store.currentStreak}
              completedCount={store.completedCount} totalCount={store.totalCount}
              nextTask={nextTask} nextTaskSection={nextTaskSection} />
          );
        })()}




        {/* Add Section Modal */}
        <input type="file" ref={fileRef} className="hidden" accept="image/png,image/jpeg,image/webp" onChange={handleIconUpload} />
        <input type="file" ref={editFileRef} className="hidden" accept="image/png,image/jpeg,image/webp"
          onChange={e => activeTab && handleEditIconUpload(e, activeTab)} />

        <AnimatePresence>
          {showAddSection && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="glass-panel bevel p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => fileRef.current?.click()} className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> :
                      newSectionIcon ? <img src={newSectionIcon} alt="" className="w-full h-full object-cover" /> :
                      <ImagePlus className="w-5 h-5 text-muted-foreground" />}
                  </button>
                  <input autoFocus value={newSectionName} onChange={e => setNewSectionName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateSection()} placeholder="Section name..." className="flex-1 bg-transparent border-b border-border pb-1 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary text-lg" />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setShowAddSection(false); setNewSectionName(''); setNewSectionIcon(null); }} className="px-3 py-1.5 text-sm rounded-xl text-muted-foreground hover:text-foreground" style={{ background: 'hsl(15, 10%, 10%)', border: '1px solid hsl(15, 15%, 16%)' }}>Cancel</button>
                  <button onClick={handleCreateSection} className="btn-premium text-primary-foreground px-4 py-1.5 text-sm">Create</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ====== ALL TASKS TAB ====== */}
        {activeTab === null && (
          <>
            <AddTaskForm sections={store.sections} stickers={stickers} onAdd={store.addTask} />

            <div className="space-y-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <h2 className="font-display text-sm text-gradient-fire whitespace-nowrap shrink-0 cursor-pointer" onClick={() => setActiveTab(null)}
                  style={activeTab === null ? { opacity: 1 } : { opacity: 0.5 }}>All Tasks</h2>

                {store.customSections.map((cs, idx) => {
                  const color = SECTION_COLORS[idx % SECTION_COLORS.length];
                  const hue = color.split(' ')[0];
                  const sat = color.split(' ')[1];
                  const isActive = activeTab === cs.id;
                  return (
                    <button
                      key={cs.id}
                      onClick={() => setActiveTab(isActive ? null : cs.id)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0"
                      style={isActive ? {
                        background: `linear-gradient(135deg, hsl(${hue} ${sat} 55%), hsl(${hue} ${sat} 40%))`,
                        color: 'white',
                        boxShadow: `0 0 12px hsl(${hue} ${sat} 50% / 0.4)`,
                      } : {
                        background: 'hsl(15, 10%, 12%)',
                        border: '1px solid hsl(15, 15%, 20%)',
                        color: 'hsl(25, 10%, 55%)',
                      }}
                    >
                      {cs.iconUrl && <img src={cs.iconUrl} alt="" className="w-4 h-4 object-contain rounded" />}
                      {cs.name}
                    </button>
                  );
                })}

                <button
                  onClick={() => setShowAddSection(true)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 hover:scale-110 transition-transform"
                  style={{
                    background: 'linear-gradient(135deg, hsl(45, 100%, 55%), hsl(25, 100%, 50%))',
                    boxShadow: '0 0 10px hsl(35 100% 50% / 0.3)',
                  }}
                  title="Add Section"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                </button>

                <span className="text-xs text-muted-foreground ml-auto shrink-0">{store.completedCount}/{store.totalCount} done</span>
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
                        onToggle={store.toggleTask} onDelete={store.deleteTask} onEdit={store.editTask}
                        onAddBandaid={store.addBandaid} onRemoveBandaid={store.removeBandaid}
                        onAddProblem={store.addProblem} onRemoveProblem={store.removeProblem}
                        visualizations={store.visualizations} onAddVisualization={store.addVisualization} onRemoveVisualization={store.removeVisualization}
                        isDragging={draggedId === task.id} dragHandleProps={{}} stickers={stickers}
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
          </>
        )}

        {/* ====== CUSTOM SECTION TAB ====== */}
        {activeTab !== null && activeCustomSection && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Section header with edit controls */}
            <div className="flex items-center gap-3">
              {activeCustomSection.iconUrl ? (
                <img src={activeCustomSection.iconUrl} alt="" className="w-10 h-10 object-contain rounded-xl" />
              ) : (
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, hsl(${activeSectionColor}), hsl(${activeSectionColor.split(' ')[0]} 60% 35%))` }}>
                  <span className="text-lg font-bold text-white">{activeCustomSection.name[0]?.toUpperCase()}</span>
                </div>
              )}

              {editingSection === activeTab ? (
                <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                  onBlur={() => { if (editName.trim()) store.editCustomSection(activeTab, { name: editName.trim() }); setEditingSection(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') { if (editName.trim()) store.editCustomSection(activeTab, { name: editName.trim() }); setEditingSection(null); } }}
                  className="flex-1 bg-transparent text-foreground font-display text-xl font-bold focus:outline-none border-b border-primary min-w-0" />
              ) : (
                <h2 className="flex-1 font-display text-xl font-bold text-foreground">{activeCustomSection.name}</h2>
              )}

              <div className="flex items-center gap-1.5">
                <button onClick={() => { setEditingSection(activeTab); setEditName(activeCustomSection.name); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  style={{ background: 'hsl(var(--muted))' }}>
                  <Pencil className="w-3.5 h-3.5 text-foreground" />
                </button>
                <button onClick={() => editFileRef.current?.click()}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  style={{ background: 'hsl(var(--muted))' }}>
                  <ImagePlus className="w-3.5 h-3.5 text-foreground" />
                </button>
                <button onClick={() => setConfirmDeleteSection(activeTab)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  style={{ background: 'hsl(0 60% 40%)' }}>
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>

            {/* Task count */}
            <div className="text-xs text-muted-foreground">
              {activeSectionTasks.filter(t => t.completed).length}/{activeSectionTasks.length} done
            </div>

            {/* Tasks in this section */}
            <div className="space-y-3">
              {activeSectionTasks.length === 0 ? (
                <div className="glass-panel bevel p-8 text-center">
                  <p className="text-muted-foreground text-sm">No tasks in this section yet.</p>
                </div>
              ) : (
                activeSectionTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    section={{ id: activeCustomSection.id, name: activeCustomSection.name, icon: '', color: activeSectionColor }}
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
                    stickers={stickers}
                    dragHandleProps={{}}
                  />
                ))
              )}
            </div>

            {/* Quick add task */}
            <div className="flex gap-2">
              <input
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTaskToSection(activeTab)}
                placeholder="Add a task..."
                className="flex-1 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                style={{
                  background: 'linear-gradient(135deg, hsl(45 100% 55% / 0.15), hsl(25 100% 50% / 0.1))',
                  border: '1px solid hsl(45 100% 55% / 0.3)',
                }}
              />
              <button onClick={() => handleAddTaskToSection(activeTab)} className="w-10 h-10 solid-circle shrink-0 hover:scale-110 transition-transform">
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Swipe hint */}
            <p className="text-center text-[10px] text-muted-foreground/50">← Swipe to navigate between sections →</p>
          </motion.div>
        )}
      </div>

      {/* Confirm delete section */}
      <ConfirmDialog
        open={!!confirmDeleteSection}
        onConfirm={() => {
          if (confirmDeleteSection) {
            store.deleteCustomSection(confirmDeleteSection);
            if (activeTab === confirmDeleteSection) setActiveTab(null);
          }
          setConfirmDeleteSection(null);
        }}
        onCancel={() => setConfirmDeleteSection(null)}
        title="Delete Section?"
        description="This will delete the section and all its tasks. Are you sure?"
      />

      <ChatWidget open={showChat} onClose={() => setShowChat(false)} sections={store.sections} tasks={store.tasks}
        onAddTask={store.addTask} onToggleTask={store.toggleTask} onDeleteTask={store.deleteTask} />
    </div>
  );
};

export default Index;
