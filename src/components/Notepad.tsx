import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, X, Plus, FolderOpen, ImagePlus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface NoteSection {
  id: string;
  name: string;
  content: string;
  images: string[];
}

const Notepad = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<NoteSection[]>([]);
  const [activeId, setActiveId] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from('notepad_sections').select('*').eq('user_id', user.id);
      if (data && data.length > 0) {
        const mapped = data.map(s => ({ id: s.id, name: s.name, content: s.content, images: s.images || [] }));
        setSections(mapped);
        setActiveId(mapped[0].id);
      } else {
        const { data: inserted } = await supabase.from('notepad_sections').insert({
          user_id: user.id, name: 'General', content: '', images: [],
        }).select().single();
        if (inserted) {
          const sec = { id: inserted.id, name: inserted.name, content: inserted.content, images: inserted.images || [] };
          setSections([sec]);
          setActiveId(sec.id);
        }
      }
      setLoaded(true);
    };
    load();
  }, [user]);

  const activeSection = sections.find(s => s.id === activeId);

  const updateSectionInDb = useCallback((id: string, updates: Partial<{ content: string; images: string[] }>) => {
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
      user_id: user.id, name: newSectionName.trim(), content: '', images: [],
    }).select().single();
    if (inserted) {
      const newSec = { id: inserted.id, name: inserted.name, content: inserted.content, images: inserted.images || [] };
      setSections([...sections, newSec]);
      setActiveId(newSec.id);
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
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setSections(prev => {
          const updated = prev.map(s => s.id === activeId ? { ...s, images: [...s.images, dataUrl] } : s);
          const sec = updated.find(s => s.id === activeId);
          if (sec) updateSectionInDb(activeId, { images: sec.images });
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setSections(prev => {
      const updated = prev.map(s => s.id === activeId ? { ...s, images: s.images.filter((_, i) => i !== index) } : s);
      const sec = updated.find(s => s.id === activeId);
      if (sec) updateSectionInDb(activeId, { images: sec.images });
      return updated;
    });
  };

  const modal = open ? createPortal(
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/60 backdrop-blur-sm p-3 sm:p-4" onClick={() => setOpen(false)}>
      <div className="flex min-h-full items-start justify-center py-3 sm:items-center sm:py-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-lg h-[min(88vh,760px)] sm:h-[min(84vh,760px)] flex flex-col overflow-hidden rounded-2xl border border-border shadow-2xl"
          style={{ background: 'hsl(15, 5%, 8%)' }}
          onClick={e => e.stopPropagation()}
        >
          <input type="file" ref={fileRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />

          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-display text-sm text-gradient-fire">Notepad</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => fileRef.current?.click()} className="w-8 h-8 solid-circle hover:scale-110 transition-transform" title="Upload Image">
                <ImagePlus className="w-4 h-4" />
              </button>
              <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:scale-110 transition-transform" style={{ background: 'hsl(0, 60%, 40%)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 overflow-x-auto border-b border-border">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 group"
                style={activeId === s.id ? {
                  background: 'linear-gradient(135deg, hsl(30, 100%, 55%), hsl(5, 85%, 48%))',
                  color: 'white',
                  boxShadow: '0 0 10px hsla(20, 90%, 52%, 0.3)',
                } : {
                  background: 'hsl(15, 10%, 10%)',
                  border: '1px solid hsl(15, 15%, 16%)',
                  color: 'hsl(25, 10%, 50%)',
                }}
              >
                <FolderOpen className="w-3 h-3" />
                {s.name}
                {sections.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); removeSection(s.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">
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
              <>
                <textarea
                  value={activeSection.content}
                  onChange={e => updateContent(e.target.value)}
                  placeholder="Write your notes here..."
                  className="w-full min-h-[200px] bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none resize-none text-sm leading-relaxed"
                />
                {activeSection.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {activeSection.images.map((img, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={img}
                          alt="Note"
                          className="w-full h-24 object-cover rounded-lg cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => setViewImage(img)}
                        />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'hsl(0, 60%, 40%)' }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>,
    document.body
  ) : null;

  const imageViewer = viewImage ? createPortal(
    <div className="fixed inset-0 z-[130] bg-black/90 flex items-center justify-center" onClick={() => setViewImage(null)}>
      <button onClick={() => setViewImage(null)} className="absolute top-4 right-4 text-white"><X className="w-6 h-6" /></button>
      <img src={viewImage} alt="Note" className="max-w-full max-h-full object-contain rounded-xl" />
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button onClick={() => setOpen(true)} className="w-9 h-9 solid-circle hover:scale-110 transition-transform" title="Notepad">
        <StickyNote className="w-5 h-5" />
      </button>
      {modal}
      {imageViewer}
    </>
  );
};

export default Notepad;
