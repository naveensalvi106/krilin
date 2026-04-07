import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Plus, ChevronRight, ChevronDown, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ConfirmDialog from './ConfirmDialog';
import { playOpen, playClose, playClick, playDelete, playAddTask } from '@/lib/sounds';

interface MindMapNode {
  id: string;
  parentId: string | null;
  text: string;
  sortOrder: number;
  children: MindMapNode[];
}

const MindMapWidget = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    const load = async () => {
      const { data } = await supabase.from('mind_map_nodes' as any).select('*').eq('user_id', user.id).order('sort_order');
      if (data) {
        const flat = (data as any[]).map(n => ({ id: n.id, parentId: n.parent_id, text: n.text, sortOrder: n.sort_order }));
        setNodes(buildTree(flat));
      }
      setLoaded(true);
    };
    load();
  }, [user, open]);

  const buildTree = (flat: { id: string; parentId: string | null; text: string; sortOrder: number }[]): MindMapNode[] => {
    const map = new Map<string, MindMapNode>();
    flat.forEach(n => map.set(n.id, { ...n, children: [] }));
    const roots: MindMapNode[] = [];
    flat.forEach(n => {
      const node = map.get(n.id)!;
      if (n.parentId && map.has(n.parentId)) {
        map.get(n.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  };

  const addNode = async (parentId: string | null) => {
    if (!user) return;
    const siblings = parentId ? findNode(nodes, parentId)?.children || [] : nodes;
    const { data: inserted } = await supabase.from('mind_map_nodes' as any).insert({
      user_id: user.id, parent_id: parentId, text: '', sort_order: siblings.length,
    } as any).select().single();
    if (inserted) {
      const n = inserted as any;
      const newNode: MindMapNode = { id: n.id, parentId: n.parent_id, text: '', sortOrder: n.sort_order, children: [] };
      if (parentId) {
        setNodes(prev => addChild(prev, parentId, newNode));
        setExpandedIds(prev => new Set([...prev, parentId]));
      } else {
        setNodes(prev => [...prev, newNode]);
      }
      setEditingId(n.id);
      setEditText('');
      playAddTask();
    }
  };

  const addChild = (tree: MindMapNode[], parentId: string, child: MindMapNode): MindMapNode[] => {
    return tree.map(n => {
      if (n.id === parentId) return { ...n, children: [...n.children, child] };
      return { ...n, children: addChild(n.children, parentId, child) };
    });
  };

  const findNode = (tree: MindMapNode[], id: string): MindMapNode | null => {
    for (const n of tree) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  };

  const updateNode = async (id: string, text: string) => {
    await supabase.from('mind_map_nodes' as any).update({ text } as any).eq('id', id);
    setNodes(prev => updateInTree(prev, id, text));
    setEditingId(null);
    playClick();
  };

  const updateInTree = (tree: MindMapNode[], id: string, text: string): MindMapNode[] => {
    return tree.map(n => {
      if (n.id === id) return { ...n, text };
      return { ...n, children: updateInTree(n.children, id, text) };
    });
  };

  const deleteNode = async (id: string) => {
    await supabase.from('mind_map_nodes' as any).delete().eq('id', id);
    setNodes(prev => removeFromTree(prev, id));
    playDelete();
  };

  const removeFromTree = (tree: MindMapNode[], id: string): MindMapNode[] => {
    return tree.filter(n => n.id !== id).map(n => ({ ...n, children: removeFromTree(n.children, id) }));
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const renderNode = (node: MindMapNode, depth: number) => {
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} style={{ paddingLeft: depth * 20 }}>
        <div className="group flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors">
          <button onClick={() => hasChildren && toggleExpand(node.id)} className="w-4 h-4 flex items-center justify-center shrink-0">
            {hasChildren ? (isExpanded ? <ChevronDown className="w-3 h-3 text-white/60" /> : <ChevronRight className="w-3 h-3 text-white/60" />) : <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
          </button>
          {editingId === node.id ? (
            <input
              autoFocus
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onBlur={() => { if (editText.trim()) updateNode(node.id, editText.trim()); else { deleteNode(node.id); } }}
              onKeyDown={e => { if (e.key === 'Enter' && editText.trim()) updateNode(node.id, editText.trim()); if (e.key === 'Escape') setEditingId(null); }}
              className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-0.5 text-sm text-white focus:outline-none"
            />
          ) : (
            <span
              className="flex-1 text-sm text-white/90 cursor-pointer hover:text-white"
              onClick={() => { setEditingId(node.id); setEditText(node.text); }}
            >
              {node.text || <span className="text-white/30 italic">Empty</span>}
            </span>
          )}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => addNode(node.id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10" title="Add child">
              <Plus className="w-3 h-3 text-white/60" />
            </button>
            <button onClick={() => setConfirmDelete(node.id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/20" title="Delete">
              <Trash2 className="w-3 h-3 text-white/40" />
            </button>
          </div>
        </div>
        {isExpanded && node.children.map(c => renderNode(c, depth + 1))}
      </div>
    );
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
            <h3 className="font-display text-sm text-gradient-fire">Mind Map</h3>
            <button onClick={() => { setOpen(false); playClose(); }} className="w-7 h-7 rounded-full flex items-center justify-center hover:scale-110 transition-transform" style={{ background: 'hsl(0, 60%, 40%)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {nodes.length === 0 && loaded && (
              <p className="text-center text-muted-foreground text-sm py-8">Start building your mind map by adding a node below.</p>
            )}
            {nodes.map(n => renderNode(n, 0))}
          </div>

          <div className="p-3 border-t border-border">
            <button
              onClick={() => addNode(null)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, hsl(30, 100%, 55%), hsl(15, 90%, 45%))',
                boxShadow: '0 0 12px hsl(25, 100%, 50% / 0.3)',
              }}
            >
              <Plus className="w-4 h-4 text-white" />
              <span className="text-white">Add Root Node</span>
            </button>
          </div>
        </motion.div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        onConfirm={() => { if (confirmDelete) deleteNode(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
        title="Delete Node?"
        description="This will delete this node and all its children."
      />
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        onClick={() => { setOpen(true); playOpen(); }}
        className="w-9 h-9 solid-circle hover:scale-110 transition-transform"
        title="Mind Map"
      >
        <Brain className="w-5 h-5" />
      </button>
      {modal}
    </>
  );
};

export default MindMapWidget;
