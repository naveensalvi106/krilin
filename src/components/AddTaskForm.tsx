import { useState } from 'react';
import { Plus, AlarmClock, Image, Bookmark, X } from 'lucide-react';
import type { Section } from '@/lib/store';
import type { TaskPreset } from '@/lib/store';
import type { Sticker } from './StickerManager';
import TimePickerModal from './TimePickerModal';
import { playAddTask, playOpen, playClose, playClick, playDelete } from '@/lib/sounds';
import ConfirmDialog from './ConfirmDialog';

interface AddTaskFormProps {
  sections: Section[];
  stickers: Sticker[];
  presets: TaskPreset[];
  onAdd: (task: { title: string; sectionId: string; bandaids: string[]; reminderTime?: string; iconUrls: string[]; sortOrder: number }) => void;
  onDeletePreset: (id: string) => void;
}

const AddTaskForm = ({ sections, stickers, presets, onAdd, onDeletePreset }: AddTaskFormProps) => {
  const [title, setTitle] = useState('');
  const [sectionId, setSectionId] = useState(sections[0]?.id || '');
  const [reminderTime, setReminderTime] = useState('');
  const [selectedIcons, setSelectedIcons] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [confirmDeletePreset, setConfirmDeletePreset] = useState<string | null>(null);

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
    onAdd({ title: title.trim(), sectionId, bandaids: [], reminderTime: reminderTime || undefined, iconUrls: selectedIcons, sortOrder: 0 });
    playAddTask();
    setTitle('');
    setReminderTime('');
    setSelectedIcons([]);
    setExpanded(false);
  };

  const handleLoadPreset = (preset: TaskPreset) => {
    setTitle(preset.title);
    setSectionId(preset.sectionId);
    setReminderTime(preset.reminderTime || '');
    setSelectedIcons(preset.iconUrls || []);
    setShowPresets(false);
    playClick();
  };

  const toggleIcon = (url: string) => {
    setSelectedIcons(prev => prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => { setExpanded(true); playOpen(); }}
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
        <div className="flex items-center gap-2">
          {selectedIcons.map((url, i) => (
            <img key={i} src={url} alt="" className="w-6 h-6 object-contain shrink-0" />
          ))}
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full bg-transparent border-b border-border pb-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-lg"
          />
        </div>

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
                boxShadow: `0 0 12px hsl(${s.color} / 0.3)`,
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

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowTimePicker(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
            style={reminderTime ? {
              background: 'linear-gradient(135deg, hsl(20, 60%, 14%), hsl(10, 40%, 10%))',
              border: '1px solid hsl(20, 50%, 25%)',
              boxShadow: '0 0 12px hsl(20, 90%, 52% / 0.12)',
            } : {
              background: 'hsl(15, 10%, 10%)',
              border: '1px solid hsl(15, 15%, 16%)',
            }}
          >
            <AlarmClock className="w-4 h-4 icon-glow" />
            <span className="text-sm">{reminderTime ? formatDisplay(reminderTime) : 'Reminder'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowIconPicker(!showIconPicker)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
            style={selectedIcons.length > 0 ? {
              background: 'linear-gradient(135deg, hsl(280, 60%, 14%), hsl(260, 40%, 10%))',
              border: '1px solid hsl(280, 50%, 25%)',
              boxShadow: '0 0 12px hsl(280, 90%, 52% / 0.12)',
            } : {
              background: 'hsl(15, 10%, 10%)',
              border: '1px solid hsl(15, 15%, 16%)',
            }}
          >
            <Image className="w-4 h-4 icon-glow" />
            <span className="text-sm">{selectedIcons.length > 0 ? `${selectedIcons.length} Icon${selectedIcons.length > 1 ? 's' : ''} ✓` : 'Add Icons'}</span>
          </button>

          {presets.length > 0 && (
            <button
              type="button"
              onClick={() => { setShowPresets(!showPresets); showPresets ? playClose() : playOpen(); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, hsl(45, 60%, 14%), hsl(30, 40%, 10%))',
                border: '1px solid hsl(45, 50%, 25%)',
                boxShadow: '0 0 12px hsl(45, 90%, 52% / 0.12)',
              }}
            >
              <Bookmark className="w-4 h-4 icon-glow" />
              <span className="text-sm">Presets ({presets.length})</span>
            </button>
          )}
        </div>

        {/* Presets picker */}
        {showPresets && presets.length > 0 && (
          <div className="rounded-xl p-3 border border-border space-y-2" style={{ background: 'hsl(15, 10%, 8%)' }}>
            <p className="text-xs text-muted-foreground font-medium">📋 Load a preset</p>
            <div className="space-y-1.5">
              {presets.map(p => {
                const presetSection = sections.find(s => s.id === p.sectionId);
                return (
                  <div key={p.id} className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:scale-[1.01] transition-all"
                    style={{ background: 'hsl(15, 10%, 12%)', border: '1px solid hsl(15, 20%, 18%)' }}
                  >
                    <div className="flex-1 flex items-center gap-2 min-w-0" onClick={() => handleLoadPreset(p)}>
                      {(p.iconUrls || []).slice(0, 3).map((url, i) => (
                        <img key={i} src={url} alt="" className="w-4 h-4 object-contain shrink-0" />
                      ))}
                      <span className="text-sm text-foreground truncate">{p.title}</span>
                      {presetSection && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: `hsl(${presetSection.color} / 0.2)`, color: `hsl(${presetSection.color})` }}>
                          {presetSection.name}
                        </span>
                      )}
                      {p.reminderTime && (
                        <span className="text-[10px] text-muted-foreground shrink-0">⏰ {formatDisplay(p.reminderTime)}</span>
                      )}
                    </div>
                    <button type="button" onClick={() => setConfirmDeletePreset(p.id)}
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 hover:scale-110 transition-transform"
                      style={{ background: 'hsl(0, 60%, 40%)' }}>
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showIconPicker && (
          <div className="rounded-xl p-3 border border-border" style={{ background: 'hsl(15, 10%, 8%)' }}>
            {stickers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No stickers yet! Upload some from your profile.</p>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                <button
                  type="button"
                  onClick={() => { setSelectedIcons([]); setShowIconPicker(false); }}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs border transition-all ${selectedIcons.length === 0 ? 'border-primary' : 'border-border'}`}
                  style={{ background: 'hsl(15, 10%, 12%)' }}
                >
                  None
                </button>
                {stickers.map(s => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => toggleIcon(s.url)}
                    className={`w-9 h-9 rounded-lg p-1 border transition-all ${selectedIcons.includes(s.url) ? 'border-primary scale-110' : 'border-border'}`}
                    style={{ background: 'hsl(15, 10%, 12%)' }}
                  >
                    <img src={s.url} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => { setExpanded(false); playClose(); }} className="px-4 py-2 text-sm rounded-xl text-muted-foreground hover:text-foreground transition-colors" style={{ background: 'hsl(15, 10%, 10%)', border: '1px solid hsl(15, 15%, 16%)' }}>
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
      <ConfirmDialog
        open={!!confirmDeletePreset}
        onConfirm={() => {
          if (confirmDeletePreset) { onDeletePreset(confirmDeletePreset); playDelete(); }
          setConfirmDeletePreset(null);
        }}
        onCancel={() => setConfirmDeletePreset(null)}
        title="Delete Preset?"
        description="Are you sure you want to delete this preset?"
      />
    </>
  );
};

export default AddTaskForm;
