import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Clock, Plus, Bandage, AlertTriangle, ChevronDown, ChevronRight, GripVertical, Pencil, Image } from 'lucide-react';
import type { Task, Section, Visualization } from '@/lib/store';
import CongratulateModal from './CongratulateModal';
import ConfirmDialog from './ConfirmDialog';

interface TaskCardProps {
  task: Task;
  section?: Section;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: { title?: string; iconUrls?: string[]; reminderTime?: string | null }) => void;
  onAddBandaid: (taskId: string, bandaid: string) => void;
  onRemoveBandaid: (taskId: string, index: number) => void;
  onAddProblem: (taskId: string, title: string, solution: string) => void;
  onRemoveProblem: (taskId: string, problemId: string) => void;
  visualizations: Visualization[];
  onAddVisualization: (text: string, image?: string, taskId?: string) => void;
  onRemoveVisualization: (id: string) => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, any>;
  stickers?: { name: string; url: string }[];
}

const TaskCard = ({ task, section, onToggle, onDelete, onEdit, onAddBandaid, onRemoveBandaid, onAddProblem, onRemoveProblem, visualizations, onAddVisualization, onRemoveVisualization, isDragging, dragHandleProps, stickers = [] }: TaskCardProps) => {
  const [showBandaids, setShowBandaids] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [newBandaid, setNewBandaid] = useState('');
  const [newProblemTitle, setNewProblemTitle] = useState('');
  const [newProblemSolution, setNewProblemSolution] = useState('');
  const [expandedProblem, setExpandedProblem] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editTime, setEditTime] = useState(task.reminderTime || '');

  // Confirm dialog state
  const [confirmAction, setConfirmAction] = useState<{ type: string; payload?: any } | null>(null);

  const handleToggle = () => {
    if (!task.completed) {
      setShowCongrats(true);
    }
    onToggle(task.id);
  };

  const handleAddBandaid = () => {
    if (newBandaid.trim()) {
      onAddBandaid(task.id, newBandaid.trim());
      setNewBandaid('');
    }
  };

  const handleAddProblem = () => {
    if (newProblemTitle.trim() && newProblemSolution.trim()) {
      onAddProblem(task.id, newProblemTitle.trim(), newProblemSolution.trim());
      setNewProblemTitle('');
      setNewProblemSolution('');
    }
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    switch (confirmAction.type) {
      case 'deleteTask': onDelete(task.id); break;
      case 'removeBandaid': onRemoveBandaid(task.id, confirmAction.payload); break;
      case 'removeProblem': onRemoveProblem(task.id, confirmAction.payload); break;
      case 'removeVisualization': onRemoveVisualization(confirmAction.payload); break;
    }
    setConfirmAction(null);
  };

  const handleSaveEdit = () => {
    if (editTitle.trim() && editTitle.trim() !== task.title) {
      onEdit(task.id, { title: editTitle.trim() });
    }
    setEditing(false);
  };

  const handleToggleIcon = (url: string) => {
    const current = task.iconUrls || [];
    const newIcons = current.includes(url) ? current.filter(u => u !== url) : [...current, url];
    onEdit(task.id, { iconUrls: newIcons });
  };

  const sectionColor = section?.color || '45 95% 53%';
  const hue = sectionColor.split(' ')[0];
  const sat = sectionColor.split(' ')[1] || '80%';

  // Per-task visualizations
  const taskVisualizations = visualizations.filter(v => v.taskId === task.id);

  return (
    <>
      <div className={`relative rounded-xl overflow-visible ${task.completed ? 'opacity-60' : ''} ${isDragging ? 'scale-[1.02]' : ''}`}>
        {/* Main card */}
        <div
          className="relative rounded-xl px-3 py-3 pl-5"
          style={{
            background: `linear-gradient(145deg, hsl(${hue} ${sat} 45%), hsl(${hue} ${sat} 35%), hsl(${hue} ${sat} 25%))`,
            border: `1px solid hsl(${hue} ${sat} 55%)`,
            borderTop: `1px solid hsl(${hue} ${sat} 60%)`,
            borderBottom: `1px solid hsl(${hue} ${sat} 20%)`,
            boxShadow: isDragging
              ? `0 8px 32px hsl(${sectionColor} / 0.5), inset 0 1px 0 hsl(${hue} ${sat} 65%), inset 0 -1px 0 hsl(${hue} ${sat} 15%)`
              : `0 4px 16px hsl(${sectionColor} / 0.3), 0 1px 3px hsl(0 0% 0% / 0.2), inset 0 1px 0 hsl(${hue} ${sat} 65%), inset 0 -1px 0 hsl(${hue} ${sat} 15%)`,
          }}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
            style={{
              background: `linear-gradient(180deg, hsl(${hue} ${sat} 70%), hsl(${hue} ${sat} 50%))`,
              boxShadow: `2px 0 8px hsl(${sectionColor} / 0.4)`,
            }}
          />

          <div className="flex items-center gap-2">
            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing touch-none text-white/60 hover:text-white transition-colors shrink-0">
              <GripVertical className="w-4 h-4" />
            </div>
            <button onClick={handleToggle} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${task.completed ? 'bg-white border-white' : 'border-white/50 hover:border-white'}`}>
              {task.completed && <Check className="w-3.5 h-3.5 text-gray-800" />}
            </button>
            {(task.iconUrls || []).map((url, i) => (
              <img key={i} src={url} alt="" className="w-5 h-5 object-contain shrink-0" />
            ))}
            {editing ? (
              <input
                autoFocus
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') { setEditTitle(task.title); setEditing(false); } }}
                className="flex-1 bg-transparent border-b border-white/30 text-[15px] font-medium text-white focus:outline-none min-w-0"
              />
            ) : (
              <span className={`flex-1 font-medium text-[15px] min-w-0 truncate ${task.completed ? 'line-through text-white/50' : 'text-white'}`}>
                {task.title}
              </span>
            )}

            {task.reminderTime && !editing && (() => {
              const [h, m] = task.reminderTime.split(':').map(Number);
              const d = new Date();
              d.setUTCHours(h, m, 0, 0);
              const hour12 = d.getHours() % 12 || 12;
              const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
              const displayTime = `${hour12}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
              return (
                <span className="flex items-center gap-0.5 text-[10px] text-white/60 shrink-0">
                  <Clock className="w-2.5 h-2.5" />
                  {displayTime}
                </span>
              );
            })()}

            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => {
                if (editing) {
                  handleSaveEdit();
                } else {
                  setEditing(true); setEditTitle(task.title); setEditTime(task.reminderTime || ''); setShowIconPicker(false);
                  setShowBandaids(false); setShowProblems(false);
                }
              }}
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 hover:scale-110"
                style={{ background: editing ? 'linear-gradient(135deg, hsl(140, 70%, 45%), hsl(160, 60%, 35%))' : 'linear-gradient(135deg, hsl(200, 80%, 55%), hsl(220, 70%, 45%))', boxShadow: editing ? '0 0 6px hsla(140, 70%, 45%, 0.3)' : '0 0 6px hsla(200, 80%, 55%, 0.3)' }}
                title={editing ? 'Done' : 'Edit'}
              >
                {editing ? <Check className="w-3.5 h-3.5 text-white" /> : <Pencil className="w-3.5 h-3.5 text-white" />}
              </button>
              {!editing && (
                <>
                  <button onClick={() => { setShowBandaids(!showBandaids); setShowProblems(false); setEditing(false); }}
                    className="w-7 h-7 solid-circle shrink-0 transition-all duration-300 hover:scale-110"
                    title="Bandaids"
                  >
                    <Bandage className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setShowProblems(!showProblems); setShowBandaids(false); setEditing(false); }}
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 hover:scale-110"
                    title="Problems"
                    style={{
                      background: 'linear-gradient(135deg, hsl(50, 100%, 55%), hsl(40, 90%, 45%))',
                      boxShadow: '0 0 6px hsla(50, 100%, 55%, 0.3)',
                    }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-gray-800" />
                  </button>
                  <button onClick={() => setConfirmAction({ type: 'deleteTask' })}
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 hover:scale-110"
                    style={{
                      background: 'linear-gradient(135deg, hsl(0, 70%, 55%), hsl(0, 60%, 40%))',
                      boxShadow: '0 0 6px hsla(0, 80%, 50%, 0.3)',
                    }}
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Edit panel — inside the card */}
          <AnimatePresence>
            {editing && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 space-y-3" style={{ borderTop: '1px solid hsla(0,0%,100%,0.15)' }}>
                  {/* Reminder time */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'hsla(0,0%,100%,0.15)' }}>
                        <Clock className="w-3.5 h-3.5 text-white/80" />
                      </div>
                      <span className="text-xs text-white/70">Reminder</span>
                      <input
                        type="time"
                        value={editTime}
                        onChange={e => {
                          const val = e.target.value;
                          setEditTime(val);
                          onEdit(task.id, { reminderTime: val || null });
                        }}
                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/40 flex-1 max-w-[140px]"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                    {editTime && (
                      <button
                        onClick={() => { setEditTime(''); onEdit(task.id, { reminderTime: null }); }}
                        className="text-[10px] px-2 py-1 rounded-full text-white/60 hover:text-white transition-colors"
                        style={{ background: 'hsla(0,70%,50%,0.3)' }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Stickers */}
                  {stickers.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowIconPicker(!showIconPicker)}
                        className="flex items-center gap-2 w-full text-left"
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: 'hsla(0,0%,100%,0.15)' }}>
                          <Image className="w-3.5 h-3.5 text-white/80" />
                        </div>
                        <span className="text-xs text-white/70 flex-1">Stickers</span>
                        <span className="text-[10px] text-white/40">{(task.iconUrls || []).length} selected</span>
                        {showIconPicker ? <ChevronDown className="w-3.5 h-3.5 text-white/50" /> : <ChevronRight className="w-3.5 h-3.5 text-white/50" />}
                      </button>
                      <AnimatePresence>
                        {showIconPicker && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-wrap gap-1.5 mt-2 pl-9">
                              {stickers.map(s => {
                                const selected = (task.iconUrls || []).includes(s.url);
                                return (
                                  <button key={s.name} type="button" onClick={() => handleToggleIcon(s.url)}
                                    className={`w-9 h-9 rounded-lg p-1 border-2 transition-all ${selected ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-white/30'}`}
                                    style={{ background: selected ? 'hsla(0,0%,100%,0.2)' : 'hsla(0,0%,100%,0.08)' }}
                                  >
                                    <img src={s.url} alt="" className="w-full h-full object-contain" />
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bandaids */}
          <AnimatePresence>
            {showBandaids && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-2 overflow-hidden mt-2">
                <p className="text-xs text-white/70 font-medium">🩹 Bandaids — Ways to get it done</p>
                {task.bandaids.length > 0 && (
                  <div className="space-y-1">
                    {task.bandaids.map((b, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg" style={{ background: 'hsla(0,0%,100%,0.1)' }}>
                        <span className="flex-1 text-white">{b}</span>
                        <button onClick={() => setConfirmAction({ type: 'removeBandaid', payload: i })} className="hover:text-red-300 transition-colors text-white/60"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {task.bandaids.length === 0 && <p className="text-xs text-white/50 italic">No bandaids yet.</p>}
                <div className="flex gap-2">
                  <input value={newBandaid} onChange={e => setNewBandaid(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddBandaid()} placeholder="Add a bandaid..." className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/50" />
                  <button onClick={handleAddBandaid} className="w-8 h-8 solid-circle shrink-0 hover:scale-110 transition-transform"><Plus className="w-4 h-4" /></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Problems */}
          <AnimatePresence>
            {showProblems && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-2 overflow-hidden mt-2">
                <p className="text-xs text-white/70 font-medium">⚠️ Problems & Solutions</p>
                {task.problems.length > 0 && (
                  <div className="space-y-1">
                    {task.problems.map((p) => (
                      <div key={p.id} className="rounded-lg overflow-hidden" style={{ background: 'hsla(0,0%,100%,0.1)' }}>
                        <div
                          onClick={() => setExpandedProblem(expandedProblem === p.id ? null : p.id)}
                          className="w-full flex items-center gap-2 p-3 text-left cursor-pointer"
                        >
                          {expandedProblem === p.id ? <ChevronDown className="w-3 h-3 shrink-0 text-white" /> : <ChevronRight className="w-3 h-3 shrink-0 text-white" />}
                          <span className="flex-1 text-sm text-white">{p.title}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'removeProblem', payload: p.id }); }} className="text-white/50 hover:text-red-300 shrink-0"><X className="w-3 h-3" /></button>
                        </div>
                        {expandedProblem === p.id && (
                          <div className="px-3 pb-3 text-xs">
                            <span className="font-medium" style={{ color: 'hsl(45, 100%, 60%)' }}>Solution:</span>
                            <p className="mt-1 text-white">{p.solution}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {task.problems.length === 0 && <p className="text-xs text-white/50 italic">No problems added yet.</p>}
                <div className="space-y-2">
                  <input value={newProblemTitle} onChange={e => setNewProblemTitle(e.target.value)} placeholder="Problem that may occur..." className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/50" />
                  <div className="flex gap-2">
                    <input value={newProblemSolution} onChange={e => setNewProblemSolution(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddProblem()} placeholder="Its solution..." className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/50" />
                    <button onClick={handleAddProblem} className="w-8 h-8 solid-circle shrink-0 hover:scale-110 transition-transform"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <CongratulateModal
        open={showCongrats}
        onClose={() => setShowCongrats(false)}
        taskTitle={task.title}
        taskId={task.id}
        visualizations={taskVisualizations}
        onAddVisualization={onAddVisualization}
        onRemoveVisualization={onRemoveVisualization}
      />

      <ConfirmDialog
        open={!!confirmAction}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
        title={confirmAction?.type === 'deleteTask' ? 'Delete Task?' : 'Remove Item?'}
        description={confirmAction?.type === 'deleteTask' ? `Are you sure you want to delete "${task.title}"?` : 'Are you sure you want to remove this?'}
      />
    </>
  );
};

export default TaskCard;
