import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Clock, Plus, Bandage, AlertTriangle, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import type { Task, Section } from '@/lib/store';
import CongratulateModal from './CongratulateModal';
import type { Visualization } from '@/lib/store';

interface TaskCardProps {
  task: Task;
  section?: Section;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddBandaid: (taskId: string, bandaid: string) => void;
  onRemoveBandaid: (taskId: string, index: number) => void;
  onAddProblem: (taskId: string, title: string, solution: string) => void;
  onRemoveProblem: (taskId: string, problemId: string) => void;
  visualizations: Visualization[];
  onAddVisualization: (text: string, image?: string) => void;
  onRemoveVisualization: (id: string) => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, any>;
}

const TaskCard = ({ task, section, onToggle, onDelete, onAddBandaid, onRemoveBandaid, onAddProblem, onRemoveProblem, visualizations, onAddVisualization, onRemoveVisualization, isDragging, dragHandleProps }: TaskCardProps) => {
  const [showBandaids, setShowBandaids] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [newBandaid, setNewBandaid] = useState('');
  const [newProblemTitle, setNewProblemTitle] = useState('');
  const [newProblemSolution, setNewProblemSolution] = useState('');
  const [expandedProblem, setExpandedProblem] = useState<string | null>(null);

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

  const sectionColor = section?.color || '25 95% 53%';
  const hue = sectionColor.split(' ')[0];
  const sat = sectionColor.split(' ')[1] || '80%';

  return (
    <>
      <motion.div
        layout
        className={`relative rounded-xl px-3 py-3 pl-5 overflow-hidden ${task.completed ? 'opacity-60' : ''} ${isDragging ? 'scale-[1.02]' : ''}`}
        style={{
          background: `linear-gradient(145deg, hsl(${hue} ${sat} 18%), hsl(${hue} ${sat} 12%), hsl(${hue} ${sat} 8%))`,
          border: `1px solid hsl(${hue} ${sat} 25%)`,
          borderTop: `1px solid hsl(${hue} ${sat} 30%)`,
          borderBottom: `1px solid hsl(${hue} ${sat} 6%)`,
          boxShadow: isDragging
            ? `0 8px 32px hsl(${sectionColor} / 0.5), inset 0 1px 0 hsl(${hue} ${sat} 28%), inset 0 -1px 0 hsl(${hue} ${sat} 5%)`
            : `0 4px 16px hsl(${sectionColor} / 0.2), 0 1px 3px hsl(0 0% 0% / 0.3), inset 0 1px 0 hsl(${hue} ${sat} 28%), inset 0 -1px 0 hsl(${hue} ${sat} 5%)`,
        }}
      >
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
          style={{
            background: `linear-gradient(180deg, hsl(${hue} ${sat} 55%), hsl(${hue} ${sat} 35%))`,
            boxShadow: `2px 0 8px hsl(${sectionColor} / 0.4)`,
          }}
        />
        {/* Single row: drag + check + icon + title + reminder + actions */}
        <div className="flex items-center gap-2">
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <GripVertical className="w-4 h-4" />
          </div>
          <button onClick={handleToggle} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${task.completed ? 'bg-primary border-primary' : 'border-muted-foreground hover:border-primary'}`}>
            {task.completed && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
          </button>
          {task.iconUrl && (
            <img src={task.iconUrl} alt="" className="w-5 h-5 object-contain shrink-0" />
          )}
          <span className={`flex-1 font-medium text-[15px] min-w-0 truncate ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {task.title}
          </span>

          {task.reminderTime && (() => {
            const [h, m] = task.reminderTime.split(':').map(Number);
            const d = new Date();
            d.setUTCHours(h, m, 0, 0);
            const hour12 = d.getHours() % 12 || 12;
            const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
            const displayTime = `${hour12}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
            return (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                <Clock className="w-2.5 h-2.5" />
                {displayTime}
              </span>
            );
          })()}

          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={() => { setShowBandaids(!showBandaids); setShowProblems(false); }}
              className="w-6 h-6 solid-circle shrink-0 transition-all duration-300 hover:scale-110"
              title="Bandaids"
            >
              <Bandage className="w-3 h-3" />
            </button>
            <button onClick={() => { setShowProblems(!showProblems); setShowBandaids(false); }}
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 hover:scale-110"
              title="Problems"
              style={{
                background: 'linear-gradient(135deg, hsl(45, 90%, 50%), hsl(30, 80%, 40%))',
                boxShadow: '0 0 6px hsla(45, 90%, 50%, 0.3)',
              }}
            >
              <AlertTriangle className="w-3 h-3" />
            </button>
            <button onClick={() => onDelete(task.id)}
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 hover:scale-110"
              style={{
                background: 'linear-gradient(135deg, hsl(0, 70%, 50%), hsl(0, 60%, 35%))',
                boxShadow: '0 0 6px hsla(0, 80%, 50%, 0.3)',
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Bandaids Section */}
        <AnimatePresence>
          {showBandaids && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-2 overflow-hidden">
              <p className="text-xs text-muted-foreground font-medium">🩹 Bandaids — Ways to get it done</p>
              {task.bandaids.length > 0 && (
                <div className="space-y-1">
                  {task.bandaids.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg" style={{ background: 'hsl(15, 10%, 10%)' }}>
                      <span className="flex-1">{b}</span>
                      <button onClick={() => onRemoveBandaid(task.id, i)} className="hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              {task.bandaids.length === 0 && <p className="text-xs text-muted-foreground italic">No bandaids yet.</p>}
              <div className="flex gap-2">
                <input value={newBandaid} onChange={e => setNewBandaid(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddBandaid()} placeholder="Add a bandaid..." className="flex-1 bg-muted border border-border rounded-xl px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                <button onClick={handleAddBandaid} className="w-8 h-8 solid-circle shrink-0 hover:scale-110 transition-transform"><Plus className="w-4 h-4" /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Problems Section */}
        <AnimatePresence>
          {showProblems && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-2 overflow-hidden">
              <p className="text-xs text-muted-foreground font-medium">⚠️ Problems & Solutions</p>
              {task.problems.length > 0 && (
                <div className="space-y-1">
                  {task.problems.map(p => (
                    <div key={p.id} className="rounded-lg overflow-hidden" style={{ background: 'hsl(15, 10%, 10%)' }}>
                      <button
                        onClick={() => setExpandedProblem(expandedProblem === p.id ? null : p.id)}
                        className="w-full flex items-center gap-2 p-3 text-left"
                      >
                        {expandedProblem === p.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <span className="flex-1 text-sm">{p.title}</span>
                        <button onClick={e => { e.stopPropagation(); onRemoveProblem(task.id, p.id); }} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                      </button>
                      {expandedProblem === p.id && (
                        <div className="px-3 pb-3 text-xs text-muted-foreground">
                          <span className="text-primary font-medium">Solution:</span>
                          <p className="mt-1">{p.solution}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {task.problems.length === 0 && <p className="text-xs text-muted-foreground italic">No problems added yet.</p>}
              <div className="space-y-2">
                <input value={newProblemTitle} onChange={e => setNewProblemTitle(e.target.value)} placeholder="Problem that may occur..." className="w-full bg-muted border border-border rounded-xl px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                <div className="flex gap-2">
                  <input value={newProblemSolution} onChange={e => setNewProblemSolution(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddProblem()} placeholder="Its solution..." className="flex-1 bg-muted border border-border rounded-xl px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                  <button onClick={handleAddProblem} className="w-8 h-8 solid-circle shrink-0 hover:scale-110 transition-transform"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <CongratulateModal
        open={showCongrats}
        onClose={() => setShowCongrats(false)}
        taskTitle={task.title}
        visualizations={visualizations}
        onAddVisualization={onAddVisualization}
        onRemoveVisualization={onRemoveVisualization}
      />
    </>
  );
};

export default TaskCard;
