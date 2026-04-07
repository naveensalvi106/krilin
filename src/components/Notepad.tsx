import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, X, Plus, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ConfirmDialog from './ConfirmDialog';
import { playOpen, playClose, playClick, playDelete, playAddTask } from '@/lib/sounds';

interface NoteSection {
  id: string;
  name: string;
  content: string;
}

const DEFAULT_SECTIONS = ['General', 'Diet', 'Fitness'];

const SECTION_STYLES: Record<string, { active: React.CSSProperties }> = {
  Diet: {
    active: {
      background: 'linear-gradient(135deg, hsl(140, 70%, 45%), hsl(160, 50%, 35%))',
      color: 'white',
      boxShadow: '0 0 10px hsla(140, 70%, 45%, 0.3)',
    },
  },
  Fitness: {
    active: {
      background: 'linear-gradient(135deg, hsl(210, 10%, 70%), hsl(220, 8%, 50%))',
      color: 'white',
      boxShadow: '0 0 10px hsla(210, 10%, 60%, 0.3)',
    },
  },
};

const Notepad = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<NoteSection[]>([]);
  const [activeId, setActiveId] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from('notepad_sections').select('*').eq('user_id', user.id);
      if (data && data.length > 0) {
        // Migrate: rename "Health" to "Diet" if found
        const mapped = data.map(s => ({
          id: s.id,
          name: s.name === 'Health' ? 'Diet' : s.name,
          content: s.content,
        }));
        // Update name in DB if changed
        for (const s of data) {
          if (s.name === 'Health') {
            supabase.from('notepad_sections').update({ name: 'Diet' }).eq('id', s.id).then();
          }
        }
        setSections(mapped);
        setActiveId(mapped[0].id);
      } else {
        // Create default sections
        const rows = DEFAULT_SECTIONS.map(name => ({
          user_id: user.id, name, content: '', images: [] as string[],
        }));
        const { data: inserted } = await supabase.from('notepad_sections').insert(rows).select();
        if (inserted) {
          const mapped = inserted.map(s => ({ id: s.id, name: s.name, content: s.content }));
          setSections(mapped);
          setActiveId(mapped[0].id);
        }
      }
      setLoaded(true);
    };
    load();
  }, [user]);

  const activeSection = sections.find(s => s.id === activeId);

  const updateSectionInDb = useCallback((id: string, updates: Partial<{ content: string }>) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      supabase.from('notepad_sections').update(updates).eq('id', id).then();
    }, 500);
  }, []);

  const updateContent = (val: string) => {
    const updated = sections.map(s => s.id === activeId ? { ...s, content: val } : s);
    setSections(updated);
    updateSectionInDb(activeId, { content: val });
  };

  const addSection = async () => {
    if (!newSectionName.trim() || !user) return;
    const { data: inserted } = await supabase.from('notepad_sections').insert({
      user_id: user.id, name: newSectionName.trim(), content: '', images: [] as string[],
    }).select().single();
    if (inserted) {
      const newSec = { id: inserted.id, name: inserted.name, content: inserted.content };
      setSections([...sections, newSec]);
      setActiveId(newSec.id);
      playAddTask();
    }
    setNewSectionName('');
    setShowAddSection(false);
  };

  const removeSection = async (id: string) => {
    if (sections.length <= 1) return;
    await supabase.from('notepad_sections').delete().eq('id', id);
    const updated = sections.filter(s => s.id !== id);
    setSections(updated);
    if (activeId === id) setActiveId(updated[0].id);
    playDelete();
  };

  const getTabStyle = (section: NoteSection, isActive: boolean): React.CSSProperties => {
    if (!isActive) {
      return {
        background: 'hsl(15, 10%, 10%)',
        border: '1px solid hsl(15, 15%, 16%)',
        color: 'hsl(25, 10%, 50%)',
      };
    }
    const custom = SECTION_STYLES[section.name];
    if (custom) return custom.active;
    return {
      background: 'linear-gradient(135deg, hsl(30, 100%, 55%), hsl(5, 85%, 48%))',
      color: 'white',
      boxShadow: '0 0 10px hsla(20, 90%, 52%, 0.3)',
    };
  };

  const modal = open ? createPortal(
    <div className="fixed inset-0 overflow-y-auto bg-black/60 backdrop-blur-sm p-3 sm:p-4" style={{ zIndex: 9999 }} onClick={() => setOpen(false)}>
      <div className="flex min-h-full items-start justify-center py-3 sm:items-center sm:py-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-lg h-[min(88vh,760px)] sm:h-[min(84vh,760px)] flex flex-col overflow-hidden rounded-2xl border border-border shadow-2xl"
          style={{ background: 'hsl(15, 5%, 8%)' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-display text-sm text-gradient-fire">Notepad</h3>
            <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:scale-110 transition-transform" style={{ background: 'hsl(0, 60%, 40%)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 p-3 overflow-x-auto border-b border-border">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 group"
                style={getTabStyle(s, activeId === s.id)}
              >
                <FolderOpen className="w-3 h-3" />
                {s.name}
                {sections.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); setConfirmRemove(s.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </button>
            ))}
            <button onClick={() => setShowAddSection(!showAddSection)} className="w-7 h-7 solid-circle shrink-0 hover:scale-110 transition-transform">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <AnimatePresence>
            {showAddSection && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-b border-border">
                <div className="flex gap-2 p-3">
                  <input value={newSectionName} onChange={e => setNewSectionName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSection()} placeholder="Section name..." className="flex-1 bg-muted border border-border rounded-xl px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                  <button onClick={addSection} className="btn-premium text-primary-foreground px-3 py-1 text-xs">Add</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-y-auto p-4">
            {activeSection && (
              <textarea
                value={activeSection.content}
                onChange={e => updateContent(e.target.value)}
                placeholder="Write your notes here..."
                className="w-full min-h-[200px] h-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none resize-none text-sm leading-relaxed"
              />
            )}
          </div>

          <ConfirmDialog
            open={!!confirmRemove}
            onConfirm={() => { if (confirmRemove) removeSection(confirmRemove); setConfirmRemove(null); }}
            onCancel={() => setConfirmRemove(null)}
            title="Delete Section?"
            description="This will delete the section and all its notes."
          />
        </motion.div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button onClick={() => { setOpen(true); playOpen(); }} className="w-9 h-9 solid-circle hover:scale-110 transition-transform" title="Notepad">
        <StickyNote className="w-5 h-5" />
      </button>
      {modal}
    </>
  );
};

export default Notepad;
