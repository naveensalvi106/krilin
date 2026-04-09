import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Plus, ChevronRight, ChevronDown, Trash2, Edit2, Check } from 'lucide-react';
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

const NODE_COLORS = [
  { bg: 'linear-gradient(135deg, hsl(30,100%,55%), hsl(15,90%,45%))', border: 'hsl(25,100%,50%)', shadow: 'hsl(25,100%,50%/0.3)', text: '#fff' },
  { bg: 'linear-gradient(135deg, hsl(200,80%,50%), hsl(220,70%,40%))', border: 'hsl(210,80%,50%)', shadow: 'hsl(210,80%,50%/0.3)', text: '#fff' },
  { bg: 'linear-gradient(135deg, hsl(140,60%,45%), hsl(160,50%,35%))', border: 'hsl(150,60%,45%)', shadow: 'hsl(150,60%,45%/0.3)', text: '#fff' },
  { bg: 'linear-gradient(135deg, hsl(280,60%,50%), hsl(300,50%,40%))', border: 'hsl(290,60%,50%)', shadow: 'hsl(290,60%,50%/0.3)', text: '#fff' },
  { bg: 'linear-gradient(135deg, hsl(350,70%,50%), hsl(10,60%,40%))', border: 'hsl(0,70%,50%)', shadow: 'hsl(0,70%,50%/0.3)', text: '#fff' },
  { bg: 'linear-gradient(135deg, hsl(45,90%,50%), hsl(35,80%,40%))', border: 'hsl(40,90%,50%)', shadow: 'hsl(40,90%,50%/0.3)', text: '#fff' },
];

const getColor = (depth: number, index: number) => NODE_COLORS[(depth + index) % NODE_COLORS.length];

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
        // Auto-expand all
        setExpandedIds(new Set((data as any[]).map(n => n.id)));
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
      if (n.parentId && map.has(n.parentId)) map.get(n.parentId)!.children.push(node);
      else roots.push(node);
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

  const addChild = (tree: MindMapNode[], parentId: string, child: MindMapNode): MindMapNode[] =>
    tree.map(n => n.id === parentId ? { ...n, children: [...n.children, child] } : { ...n, children: addChild(n.children, parentId, child) });

  const findNode = (tree: MindMapNode[], id: string): MindMapNode | null => {
    for (const n of tree) { if (n.id === id) return n; const f = findNode(n.children, id); if (f) return f; }
    return null;
  };

  const updateNode = async (id: string, text: string) => {
    await supabase.from('mind_map_nodes' as any).update({ text } as any).eq('id', id);
    setNodes(prev => mapTree(prev, id, n => ({ ...n, text })));
    setEditingId(null);
    playClick();
  };

  const mapTree = (tree: MindMapNode[], id: string, fn: (n: MindMapNode) => MindMapNode): MindMapNode[] =>
    tree.map(n => n.id === id ? fn(n) : { ...n, children: mapTree(n.children, id, fn) });

  const deleteNode = async (id: string) => {
    // Get all descendant IDs to delete
    const collectIds = (node: MindMapNode): string[] => [node.id, ...node.children.flatMap(collectIds)];
    const target = findNode(nodes, id);
    if (target) {
      const ids = collectIds(target);
      await Promise.all(ids.map(i => supabase.from('mind_map_nodes' as any).delete().eq('id', i)));
    }
    setNodes(prev => removeFromTree(prev, id));
    playDelete();
  };

  const removeFromTree = (tree: MindMapNode[], id: string): MindMapNode[] =>
    tree.filter(n => n.id !== id).map(n => ({ ...n, children: removeFromTree(n.children, id) }));

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
    playClick();
  };

  const renderNode = (node: MindMapNode, depth: number, index: number) => {
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children.length > 0;
    const color = getColor(depth, index);
    const isRoot = depth === 0;

    return (
      <motion.div
        key={node.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className="relative"
      >
        {/* Connector line */}
        {depth > 0 && (
          <div className="absolute left-[-16px] top-[18px] w-4 h-px" style={{ background: color.border }} />
        )}

        {/* Node box */}
        <div
          className={`group relative rounded-xl border-2 mb-2 transition-all hover:scale-[1.01] ${isRoot ? 'px-4 py-3' : 'px-3 py-2'}`}
          style={{
            background: color.bg,
            borderColor: color.border,
            boxShadow: `0 4px 16px ${color.shadow}, inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.15)`,
          }}
        >
          <div className="flex items-center gap-2">
            {/* Expand toggle */}
            {hasChildren ? (
              <button onClick={() => toggleExpand(node.id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/20 transition-colors shrink-0">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white" />}
              </button>
            ) : (
              <div className="w-2 h-2 rounded-full bg-white/50 shrink-0 ml-1.5 mr-1" />
            )}

            {/* Text or input */}
            {editingId === node.id ? (
              <div className="flex-1 flex items-center gap-1">
                <input
                  autoFocus
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && editText.trim()) updateNode(node.id, editText.trim());
                    if (e.key === 'Escape') { if (!node.text) deleteNode(node.id); else setEditingId(null); }
                  }}
                  className="flex-1 bg-black/20 border border-white/30 rounded-lg px-2 py-1 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/60"
                  placeholder="Type something..."
                />
                <button
                  onClick={() => { if (editText.trim()) updateNode(node.id, editText.trim()); else deleteNode(node.id); }}
                  className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/20 hover:bg-white/30"
                >
                  <Check className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ) : (
              <span
                className={`flex-1 text-white font-medium cursor-pointer select-none ${isRoot ? 'text-sm' : 'text-xs'}`}
                onDoubleClick={() => { setEditingId(node.id); setEditText(node.text); }}
              >
                {node.text || <span className="text-white/40 italic">Empty node</span>}
              </span>
            )}

            {/* Actions */}
            {editingId !== node.id && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditingId(node.id); setEditText(node.text); }} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/20" title="Edit">
                  <Edit2 className="w-3 h-3 text-white/70" />
                </button>
                <button onClick={() => addNode(node.id)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/20" title="Add child">
                  <Plus className="w-3 h-3 text-white/70" />
                </button>
                <button onClick={() => setConfirmDelete(node.id)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-500/30" title="Delete">
                  <Trash2 className="w-3 h-3 text-white/70" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Children */}
        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pl-6 ml-3 border-l-2 overflow-hidden"
              style={{ borderColor: `${color.border}` }}
            >
              {node.children.map((c, i) => renderNode(c, depth + 1, i))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const modal = open ? createPortal(
    <div className="fixed inset-0 overflow-y-auto bg-black/60 backdrop-blur-sm p-3 sm:p-4" style={{ zIndex: 9999 }} onClick={() => { setOpen(false); playClose(); }}>
      <div className="flex min-h-full items-start justify-center py-3 sm:items-center sm:py-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-xl h-[min(88vh,760px)] sm:h-[min(84vh,760px)] flex flex-col overflow-hidden rounded-2xl border border-border shadow-2xl"
          style={{ background: 'hsl(15, 5%, 8%)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <h3 className="font-display text-sm text-gradient-fire font-bold">Mind Map</h3>
            </div>
            <button onClick={() => { setOpen(false); playClose(); }} className="w-7 h-7 rounded-full flex items-center justify-center hover:scale-110 transition-transform" style={{ background: 'hsl(0, 60%, 40%)' }}>
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {nodes.length === 0 && loaded && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Brain className="w-10 h-10 text-white/20" />
                <p className="text-muted-foreground text-sm text-center">Start building your mind map<br/>by adding a root node below.</p>
              </div>
            )}
            {nodes.map((n, i) => renderNode(n, 0, i))}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border">
            <button
              onClick={() => addNode(null)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, hsl(30, 100%, 55%), hsl(15, 90%, 45%))',
                boxShadow: '0 4px 16px hsl(25 100% 50% / 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
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
