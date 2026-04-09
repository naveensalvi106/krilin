import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ListChecks, X, Plus, Check, Trash2, FolderOpen, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ConfirmDialog from './ConfirmDialog';
import { playOpen, playClose, playClick, playDelete, playAddTask, playComplete } from '@/lib/sounds';

interface TickList {
  id: string;
  name: string;
  items: TickListItem[];
}

interface TickListItem {
  id: string;
  text: string;
  completed: boolean;
  sortOrder: number;
}

const TickListWidget = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<TickList[]>([]);
  const [activeListId, setActiveListId] = useState('');
  const [newListName, setNewListName] = useState('');
  const [showAddList, setShowAddList] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'list' | 'item'; id: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    const load = async () => {
      const { data: listsData } = await supabase.from('tick_lists' as any).select('*').eq('user_id', user.id).order('created_at');
      const { data: itemsData } = await supabase.from('tick_list_items' as any).select('*').eq('user_id', user.id).order('sort_order');
      const ls = ((listsData as any[]) || []).map(l => ({
        id: l.id,
        name: l.name,
        items: ((itemsData as any[]) || []).filter(i => i.list_id === l.id).map(i => ({
          id: i.id, text: i.text, completed: i.completed, sortOrder: i.sort_order,
        })),
      }));
      setLists(ls);
      if (ls.length > 0 && !activeListId) setActiveListId(ls[0].id);
      setLoaded(true);
    };
    load();
  }, [user, open]);

  const activeList = lists.find(l => l.id === activeListId);
  const completedCount = activeList?.items.filter(i => i.completed).length || 0;
  const totalCount = activeList?.items.length || 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const addList = async () => {
    if (!newListName.trim() || !user) return;
    const { data: inserted } = await supabase.from('tick_lists' as any).insert({ user_id: user.id, name: newListName.trim() } as any).select().single();
    if (inserted) {
      const l = inserted as any;
      const newList = { id: l.id, name: l.name, items: [] };
      setLists(prev => [...prev, newList]);
      setActiveListId(l.id);
      playAddTask();
    }
    setNewListName('');
    setShowAddList(false);
  };

  const deleteList = async (id: string) => {
    await supabase.from('tick_lists' as any).delete().eq('id', id);
    setLists(prev => {
      const updated = prev.filter(l => l.id !== id);
      if (activeListId === id && updated.length > 0) setActiveListId(updated[0].id);
      return updated;
    });
    playDelete();
  };

  const addItem = async () => {
    if (!newItemText.trim() || !user || !activeListId) return;
    const sortOrder = activeList?.items.length || 0;
    const { data: inserted } = await supabase.from('tick_list_items' as any).insert({
      user_id: user.id, list_id: activeListId, text: newItemText.trim(), sort_order: sortOrder,
    } as any).select().single();
    if (inserted) {
      const i = inserted as any;
      setLists(prev => prev.map(l => l.id === activeListId ? {
        ...l, items: [...l.items, { id: i.id, text: i.text, completed: false, sortOrder: i.sort_order }],
      } : l));
      playAddTask();
    }
    setNewItemText('');
  };

  const toggleItem = async (itemId: string) => {
    const item = activeList?.items.find(i => i.id === itemId);
    if (!item) return;
    const newCompleted = !item.completed;
    await supabase.from('tick_list_items' as any).update({ completed: newCompleted } as any).eq('id', itemId);
    setLists(prev => prev.map(l => l.id === activeListId ? {
      ...l, items: l.items.map(i => i.id === itemId ? { ...i, completed: newCompleted } : i),
    } : l));
    if (newCompleted) playComplete(); else playClick();
  };

  const deleteItem = async (itemId: string) => {
    await supabase.from('tick_list_items' as any).delete().eq('id', itemId);
    setLists(prev => prev.map(l => l.id === activeListId ? {
      ...l, items: l.items.filter(i => i.id !== itemId),
    } : l));
    playDelete();
  };

  const handleConfirm = () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'list') deleteList(confirmDelete.id);
    else deleteItem(confirmDelete.id);
    setConfirmDelete(null);
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
            <h3 className="font-display text-sm text-gradient-fire">Tick Lists</h3>
            <button onClick={() => { setOpen(false); playClose(); }} className="w-7 h-7 rounded-full flex items-center justify-center hover:scale-110 transition-transform" style={{ background: 'hsl(0, 60%, 40%)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List tabs */}
          <div className="flex items-center gap-2 p-3 overflow-x-auto border-b border-border">
            {lists.map((l, idx) => (
              <div key={l.id} className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => { setActiveListId(l.id); playClick(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                  style={activeListId === l.id ? {
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
                  {l.name}
                </button>
                {activeListId === l.id && (
                  <div className="flex items-center gap-0.5 ml-0.5">
                    {idx > 0 && (
                      <button onClick={() => swapLists(idx, idx - 1)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10">
                        <ChevronLeft className="w-3 h-3 text-white/50" />
                      </button>
                    )}
                    {idx < lists.length - 1 && (
                      <button onClick={() => swapLists(idx, idx + 1)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10">
                        <ChevronRight className="w-3 h-3 text-white/50" />
                      </button>
                    )}
                    {lists.length > 1 && (
                      <button onClick={() => setConfirmDelete({ type: 'list', id: l.id })} className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/20">
                        <X className="w-3 h-3 text-red-400/70" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            <button onClick={() => setShowAddList(!showAddList)} className="w-7 h-7 solid-circle shrink-0 hover:scale-110 transition-transform">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <AnimatePresence>
            {showAddList && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-b border-border">
                <div className="flex gap-2 p-3">
                  <input value={newListName} onChange={e => setNewListName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addList()} placeholder="List name..." className="flex-1 bg-muted border border-border rounded-xl px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                  <button onClick={addList} className="btn-premium text-primary-foreground px-3 py-1 text-xs">Add</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress bar */}
          {activeList && totalCount > 0 && (
            <div className="px-4 pt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">{completedCount}/{totalCount} completed</span>
                <span className="text-xs font-bold" style={{ color: progressPercent === 100 ? 'hsl(45, 100%, 55%)' : 'hsl(30, 100%, 55%)' }}>{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'hsl(15, 10%, 12%)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: progressPercent === 100
                      ? 'linear-gradient(90deg, hsl(45, 100%, 55%), hsl(35, 100%, 50%))'
                      : 'linear-gradient(90deg, hsl(30, 100%, 55%), hsl(15, 90%, 45%))',
                    boxShadow: `0 0 8px ${progressPercent === 100 ? 'hsl(45, 100%, 55% / 0.5)' : 'hsl(25, 100%, 50% / 0.3)'}`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
            {!activeList && loaded && (
              <p className="text-center text-muted-foreground text-sm py-8">Create a list to get started!</p>
            )}
            {activeList?.items.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">No items yet. Add one below!</p>
            )}
            {activeList?.items.map(item => (
              <motion.div
                key={item.id}
                layout
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl group transition-all"
                style={{
                  background: item.completed ? 'hsl(15, 10%, 10%)' : 'hsl(15, 10%, 12%)',
                  border: `1px solid ${item.completed ? 'hsl(15, 10%, 14%)' : 'hsl(15, 20%, 18%)'}`,
                }}
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${item.completed ? 'border-primary bg-primary' : 'border-muted-foreground/40 hover:border-primary'}`}
                >
                  {item.completed && <Check className="w-3 h-3 text-primary-foreground" />}
                </button>
                <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item.text}</span>
                <button
                  onClick={() => setConfirmDelete({ type: 'item', id: item.id })}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-400" />
                </button>
              </motion.div>
            ))}
          </div>

          {/* Add item */}
          {activeList && (
            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <input
                  value={newItemText}
                  onChange={e => setNewItemText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addItem()}
                  placeholder="Add an item..."
                  className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
                <button
                  onClick={addItem}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, hsl(30, 100%, 55%), hsl(15, 90%, 45%))',
                    boxShadow: '0 0 12px hsl(25, 100%, 50% / 0.3)',
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmDelete(null)}
        title={confirmDelete?.type === 'list' ? 'Delete List?' : 'Delete Item?'}
        description={confirmDelete?.type === 'list' ? 'This will delete the list and all its items.' : 'Are you sure you want to remove this item?'}
      />
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        onClick={() => { setOpen(true); playOpen(); }}
        className="w-9 h-9 solid-circle hover:scale-110 transition-transform"
        title="Tick Lists"
      >
        <ListChecks className="w-5 h-5" />
      </button>
      {modal}
    </>
  );
};

export default TickListWidget;
