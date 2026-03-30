import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Pencil, ChevronDown, ChevronRight, Check, GripVertical, Bandage, AlertTriangle, Clock, ImagePlus, Loader2 } from 'lucide-react';
import type { Task, CustomSection, Visualization } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import TaskCard from './TaskCard';
import ConfirmDialog from './ConfirmDialog';
import type { Sticker } from './StickerManager';

// Random bright colors for custom sections
const SECTION_COLORS = [
  '45 95% 50%', '200 80% 50%', '280 70% 50%', '120 65% 45%', '340 75% 55%',
  '170 70% 45%', '25 90% 55%', '260 65% 55%', '60 80% 45%', '310 60% 50%',
];

interface CustomSectionsViewProps {
  customSections: CustomSection[];
  allTasks: Task[];
  visualizations: Visualization[];
  stickers: Sticker[];
  onAddCustomSection: (name: string, iconUrl?: string) => void;
  onEditCustomSection: (id: string, updates: { name?: string; iconUrl?: string }) => void;
  onDeleteCustomSection: (id: string) => void;
  onAddTask: (task: any) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, updates: { title?: string; iconUrls?: string[] }) => void;
  onAddBandaid: (taskId: string, bandaid: string) => void;
  onRemoveBandaid: (taskId: string, index: number) => void;
  onAddProblem: (taskId: string, title: string, solution: string) => void;
  onRemoveProblem: (taskId: string, problemId: string) => void;
  onAddVisualization: (text: string, image?: string, taskId?: string) => void;
  onRemoveVisualization: (id: string) => void;
}

const CustomSectionsView = ({
  customSections, allTasks, visualizations, stickers,
  onAddCustomSection, onEditCustomSection, onDeleteCustomSection,
  onAddTask, onToggleTask, onDeleteTask, onEditTask,
  onAddBandaid, onRemoveBandaid, onAddProblem, onRemoveProblem,
  onAddVisualization, onRemoveVisualization,
}: CustomSectionsViewProps) => {
  const { user } = useAuth();
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [newSectionIcon, setNewSectionIcon] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

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
    onAddCustomSection(newSectionName.trim(), newSectionIcon || undefined);
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
    if (url) onEditCustomSection(sectionId, { iconUrl: url });
    setUploading(false);
    e.target.value = '';
  };

  const handleAddTaskToSection = (sectionId: string) => {
    const title = newTaskTitle[sectionId]?.trim();
    if (!title) return;
    // Use first default section as fallback for section_id (required field)
    onAddTask({
      title, sectionId: 'custom', bandaids: [], iconUrls: [], sortOrder: 0, customSectionId: sectionId,
    });
    setNewTaskTitle(prev => ({ ...prev, [sectionId]: '' }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm text-gradient-fire">My Sections</h2>
        <button onClick={() => setShowAddSection(!showAddSection)} className="w-7 h-7 solid-circle hover:scale-110 transition-transform">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <input type="file" ref={fileRef} className="hidden" accept="image/png,image/jpeg,image/webp" onChange={handleIconUpload} />

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

      {customSections.length === 0 && !showAddSection && (
        <div className="glass-panel bevel p-6 text-center">
          <p className="text-muted-foreground text-sm">No custom sections yet. Create one to organize your side tasks.</p>
        </div>
      )}

      {customSections.map((cs, idx) => {
        const sectionTasks = allTasks.filter(t => t.customSectionId === cs.id).sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return a.sortOrder - b.sortOrder;
        });
        const isExpanded = expandedSection === cs.id;
        const color = SECTION_COLORS[idx % SECTION_COLORS.length];
        const hue = color.split(' ')[0];
        const sat = color.split(' ')[1];
        const completedCount = sectionTasks.filter(t => t.completed).length;

        return (
          <div key={cs.id} className="rounded-xl overflow-hidden" style={{
            background: `linear-gradient(145deg, hsl(${hue} ${sat} 30%), hsl(${hue} ${sat} 20%))`,
            border: `1px solid hsl(${hue} ${sat} 40%)`,
          }}>
            <input type="file" ref={editFileRef} className="hidden" accept="image/png,image/jpeg,image/webp" onChange={e => handleEditIconUpload(e, cs.id)} />

            {/* Section Header */}
            <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpandedSection(isExpanded ? null : cs.id)}>
              {cs.iconUrl ? (
                <img src={cs.iconUrl} alt="" className="w-8 h-8 object-contain rounded-lg shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `hsl(${color})` }}>
                  <span className="text-sm font-bold text-white">{cs.name[0]?.toUpperCase()}</span>
                </div>
              )}

              {editingSection === cs.id ? (
                <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                  onBlur={() => { if (editName.trim()) onEditCustomSection(cs.id, { name: editName.trim() }); setEditingSection(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') { if (editName.trim()) onEditCustomSection(cs.id, { name: editName.trim() }); setEditingSection(null); } }}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 bg-transparent text-white font-medium text-sm focus:outline-none border-b border-white/30 min-w-0" />
              ) : (
                <span className="flex-1 font-medium text-white text-sm">{cs.name}</span>
              )}

              <span className="text-xs text-white/50">{completedCount}/{sectionTasks.length}</span>

              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <button onClick={() => { setEditingSection(cs.id); setEditName(cs.name); }} className="w-6 h-6 rounded-full flex items-center justify-center hover:scale-110 transition-transform" style={{ background: 'hsla(0,0%,100%,0.15)' }}>
                  <Pencil className="w-3 h-3 text-white" />
                </button>
                <button onClick={() => editFileRef.current?.click()} className="w-6 h-6 rounded-full flex items-center justify-center hover:scale-110 transition-transform" style={{ background: 'hsla(0,0%,100%,0.15)' }}>
                  <ImagePlus className="w-3 h-3 text-white" />
                </button>
                <button onClick={() => setConfirmDelete(cs.id)} className="w-6 h-6 rounded-full flex items-center justify-center hover:scale-110 transition-transform" style={{ background: 'hsla(0, 60%, 50%, 0.4)' }}>
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>

              {isExpanded ? <ChevronDown className="w-4 h-4 text-white/50 shrink-0" /> : <ChevronRight className="w-4 h-4 text-white/50 shrink-0" />}
            </div>

            {/* Expanded content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="px-3 pb-3 space-y-2">
                    {sectionTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        section={{ id: cs.id, name: cs.name, icon: '', color }}
                        onToggle={onToggleTask}
                        onDelete={onDeleteTask}
                        onEdit={onEditTask}
                        onAddBandaid={onAddBandaid}
                        onRemoveBandaid={onRemoveBandaid}
                        onAddProblem={onAddProblem}
                        onRemoveProblem={onRemoveProblem}
                        visualizations={visualizations}
                        onAddVisualization={onAddVisualization}
                        onRemoveVisualization={onRemoveVisualization}
                        stickers={stickers}
                        dragHandleProps={{}}
                      />
                    ))}

                    {/* Quick add task */}
                    <div className="flex gap-2">
                      <input
                        value={newTaskTitle[cs.id] || ''}
                        onChange={e => setNewTaskTitle(prev => ({ ...prev, [cs.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleAddTaskToSection(cs.id)}
                        placeholder="Add a task..."
                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/50"
                      />
                      <button onClick={() => handleAddTaskToSection(cs.id)} className="w-8 h-8 solid-circle shrink-0 hover:scale-110 transition-transform">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      <ConfirmDialog
        open={!!confirmDelete}
        onConfirm={() => { if (confirmDelete) onDeleteCustomSection(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
        title="Delete Section?"
        description="This will delete the section and all its tasks. Are you sure?"
      />
    </div>
  );
};

export default CustomSectionsView;
