import { useState } from 'react';
import { Plus, AlarmClock } from 'lucide-react';
import type { Section } from '@/lib/store';
import TimePickerModal from './TimePickerModal';

interface AddTaskFormProps {
  sections: Section[];
  onAdd: (task: { title: string; sectionId: string; bandaids: string[]; reminderTime?: string }) => void;
}

const AddTaskForm = ({ sections, onAdd }: AddTaskFormProps) => {
  const [title, setTitle] = useState('');
  const [sectionId, setSectionId] = useState(sections[0]?.id || '');
  const [reminderTime, setReminderTime] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const formatDisplay = (time: string) => {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), sectionId, bandaids: [], reminderTime: reminderTime || undefined });
    setTitle('');
    setReminderTime('');
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full glass-panel bevel p-4 flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group"
      >
        <Plus className="w-5 h-5 icon-glow" />
        <span>Add new task to your system...</span>
      </button>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="glass-panel bevel p-5 space-y-4">
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="w-full bg-transparent border-b border-border pb-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-lg"
        />

        <div className="flex flex-wrap gap-2">
          {sections.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSectionId(s.id)}
              className="text-xs px-3 py-1.5 rounded-full transition-all"
              style={sectionId === s.id ? {
                background: `linear-gradient(135deg, hsl(${s.color}), hsl(${s.color.split(' ')[0]} 60% 35%))`,
                color: 'white',
                boxShadow: `0 0 12px hsla(${s.color}, 0.3)`,
              } : {
                background: 'hsl(15, 10%, 12%)',
                border: '1px solid hsl(15, 20%, 18%)',
                color: 'hsl(25, 10%, 50%)',
              }}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Set Reminder Button */}
        <button
          type="button"
          onClick={() => setShowTimePicker(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
          style={reminderTime ? {
            background: 'linear-gradient(135deg, hsl(20, 60%, 14%), hsl(10, 40%, 10%))',
            border: '1px solid hsl(20, 50%, 25%)',
            boxShadow: '0 0 12px hsla(20, 90%, 52%, 0.12)',
          } : {
            background: 'hsl(15, 10%, 10%)',
            border: '1px solid hsl(15, 15%, 16%)',
          }}
        >
          <AlarmClock className="w-4 h-4 icon-glow" />
          <span className="text-sm">{reminderTime ? formatDisplay(reminderTime) : 'Set Reminder'}</span>
        </button>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => setExpanded(false)} className="px-4 py-2 text-sm rounded-xl text-muted-foreground hover:text-foreground transition-colors" style={{ background: 'hsl(15, 10%, 10%)', border: '1px solid hsl(15, 15%, 16%)' }}>
            Cancel
          </button>
          <button type="submit" className="btn-premium text-primary-foreground px-6 py-2 text-sm">Add Task</button>
        </div>
      </form>
      <TimePickerModal
        open={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onConfirm={setReminderTime}
        initialTime={reminderTime}
      />
    </>
  );
};

export default AddTaskForm;
