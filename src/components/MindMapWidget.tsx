import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Plus, Trash2, Edit2, Check, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
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

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const BRANCH_COLORS = [
  { bg: '#FF6B35', light: '#FF6B3520', border: '#FF6B35', glow: '0 0 20px #FF6B3540' },
  { bg: '#3B82F6', light: '#3B82F620', border: '#3B82F6', glow: '0 0 20px #3B82F640' },
  { bg: '#10B981', light: '#10B98120', border: '#10B981', glow: '0 0 20px #10B98140' },
  { bg: '#A855F7', light: '#A855F720', border: '#A855F7', glow: '0 0 20px #A855F740' },
  { bg: '#F43F5E', light: '#F43F5E20', border: '#F43F5E', glow: '0 0 20px #F43F5E40' },
  { bg: '#EAB308', light: '#EAB30820', border: '#EAB308', glow: '0 0 20px #EAB30840' },
  { bg: '#06B6D4', light: '#06B6D420', border: '#06B6D4', glow: '0 0 20px #06B6D440' },
  { bg: '#EC4899', light: '#EC489920', border: '#EC4899', glow: '0 0 20px #EC489940' },
];

const getBranchColor = (branchIndex: number) => BRANCH_COLORS[branchIndex % BRANCH_COLORS.length];

const MindMapWidget = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

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
      if (n.parentId && map.has(n.parentId)) map.get(n.parentId)!.children.push(node);
      else roots.push(node);
    });
    return roots;
  };

  const findNode = (tree: MindMapNode[], id: string): MindMapNode | null => {
    for (const n of tree) { if (n.id === id) return n; const f = findNode(n.children, id); if (f) return f; }
    return null;
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

  const updateNode = async (id: string, text: string) => {
    await supabase.from('mind_map_nodes' as any).update({ text } as any).eq('id', id);
    setNodes(prev => mapTree(prev, id, n => ({ ...n, text })));
    setEditingId(null);
    playClick();
  };

  const mapTree = (tree: MindMapNode[], id: string, fn: (n: MindMapNode) => MindMapNode): MindMapNode[] =>
    tree.map(n => n.id === id ? fn(n) : { ...n, children: mapTree(n.children, id, fn) });

  const deleteNode = async (id: string) => {
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

  // Count total descendants
  const countDescendants = (node: MindMapNode): number => {
    let count = 1;
    node.children.forEach(c => count += countDescendants(c));
    return count;
  };

  // Canvas pan handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-node]') || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x),
      y: panStart.current.panY + (e.clientY - panStart.current.y),
    });
  }, [isPanning]);

  const handlePointerUp = useCallback(() => setIsPanning(false), []);

  const resetView = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  // Render a single node box
  const renderNodeBox = (node: MindMapNode, depth: number, branchIndex: number) => {
    const color = getBranchColor(branchIndex);
    const isRoot = depth === 0;
    const isEditing = editingId === node.id;

    return (
      <div data-node className="relative" key={node.id}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: depth * 0.05 }}
          className={`group relative ${isRoot ? 'min-w-[140px]' : 'min-w-[100px]'}`}
        >
          {/* Node card */}
          <div
            className={`relative rounded-2xl border-2 transition-all cursor-default ${isRoot ? 'px-5 py-3.5' : 'px-3.5 py-2'}`}
            style={{
              background: isRoot
                ? `linear-gradient(135deg, ${color.bg}, ${color.bg}CC)`
                : `linear-gradient(135deg, ${color.bg}18, ${color.bg}08)`,
              borderColor: isRoot ? `${color.bg}` : `${color.bg}50`,
              boxShadow: isRoot ? color.glow : `0 2px 8px ${color.bg}15`,
            }}
          >
            {isEditing ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && editText.trim()) updateNode(node.id, editText.trim());
                    if (e.key === 'Escape') { if (!node.text) deleteNode(node.id); else setEditingId(null); }
                  }}
                  className={`flex-1 bg-black/30 border border-white/20 rounded-lg px-2 py-1 text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 ${isRoot ? 'text-sm' : 'text-xs'}`}
                  placeholder="Type..."
                  style={{ minWidth: 80 }}
                />
                <button
                  onClick={() => { if (editText.trim()) updateNode(node.id, editText.trim()); else deleteNode(node.id); }}
                  className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/20 hover:bg-white/30 shrink-0"
                >
                  <Check className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={`flex-1 select-none ${isRoot ? 'text-sm font-bold' : 'text-xs font-medium'}`}
                  style={{ color: isRoot ? '#fff' : color.bg }}
                  onDoubleClick={() => { setEditingId(node.id); setEditText(node.text); }}
                >
                  {node.text || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Empty</span>}
                </span>
              </div>
            )}

            {/* Hover actions */}
            {!isEditing && (
              <div className="absolute -top-2 -right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={() => addNode(node.id)}
                  className="w-5 h-5 rounded-full flex items-center justify-center shadow-lg"
                  style={{ background: color.bg }}
                  title="Add child"
                >
                  <Plus className="w-3 h-3 text-white" />
                </button>
                <button
                  onClick={() => { setEditingId(node.id); setEditText(node.text); }}
                  className="w-5 h-5 rounded-full flex items-center justify-center shadow-lg"
                  style={{ background: color.bg }}
                  title="Edit"
                >
                  <Edit2 className="w-2.5 h-2.5 text-white" />
                </button>
                <button
                  onClick={() => setConfirmDelete(node.id)}
                  className="w-5 h-5 rounded-full flex items-center justify-center shadow-lg bg-red-500"
                  title="Delete"
                >
                  <Trash2 className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Children rendered as a branch */}
        {node.children.length > 0 && (
          <div className="flex flex-col gap-2 mt-2 pl-6 relative">
            {/* Vertical line */}
            <div
              className="absolute left-[10px] top-0 bottom-0 w-[2px] rounded-full"
              style={{ background: `${color.bg}30` }}
            />
            {node.children.map((child, i) => (
              <div key={child.id} className="relative flex items-start">
                {/* Horizontal connector */}
                <div
                  className="absolute left-[-14px] top-[14px] w-[14px] h-[2px] rounded-full"
                  style={{ background: `${color.bg}50` }}
                />
                {/* Dot at connection */}
                <div
                  className="absolute left-[-18px] top-[11px] w-[8px] h-[8px] rounded-full"
                  style={{ background: color.bg, boxShadow: `0 0 6px ${color.bg}60` }}
                />
                {renderNodeBox(child, depth + 1, branchIndex)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render the mind map layout - central root with radial branches
  const renderMindMapLayout = () => {
    if (nodes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B3530, #FF6B3510)', border: '2px dashed #FF6B3540' }}>
            <Brain className="w-8 h-8" style={{ color: '#FF6B3580' }} />
          </div>
          <p className="text-muted-foreground text-sm text-center">Start your mind map<br/>by adding a central idea</p>
          <button
            onClick={() => addNode(null)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #E85D20)', color: '#fff', boxShadow: '0 4px 16px #FF6B3540' }}
          >
            <Plus className="w-4 h-4" /> Add Central Idea
          </button>
        </div>
      );
    }

    // Single root: render it as central with children as branches
    if (nodes.length === 1) {
      const root = nodes[0];
      return (
        <div className="flex flex-col items-center gap-6 min-w-max">
          {/* Central node */}
          <div data-node className="relative">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="group relative"
            >
              <div
                className="relative rounded-2xl border-2 px-8 py-4 min-w-[180px] text-center"
                style={{
                  background: 'linear-gradient(135deg, #FF6B35, #E85D20)',
                  borderColor: '#FF6B35',
                  boxShadow: '0 0 30px #FF6B3550, 0 8px 32px #FF6B3530',
                }}
              >
                {editingId === root.id ? (
                  <div className="flex items-center gap-2 justify-center">
                    <input
                      autoFocus
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && editText.trim()) updateNode(root.id, editText.trim());
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="bg-black/30 border border-white/30 rounded-lg px-3 py-1 text-sm text-white placeholder:text-white/40 focus:outline-none text-center"
                      placeholder="Central idea..."
                    />
                    <button onClick={() => { if (editText.trim()) updateNode(root.id, editText.trim()); }} className="w-6 h-6 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <span
                    className="text-base font-bold text-white cursor-pointer"
                    onDoubleClick={() => { setEditingId(root.id); setEditText(root.text); }}
                  >
                    {root.text || <span className="opacity-40 italic">Central idea</span>}
                  </span>
                )}

                {/* Hover actions for root */}
                {editingId !== root.id && (
                  <div className="absolute -top-3 -right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={() => addNode(root.id)} className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-lg" title="Add branch">
                      <Plus className="w-3 h-3 text-white" />
                    </button>
                    <button onClick={() => { setEditingId(root.id); setEditText(root.text); }} className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-lg" title="Edit">
                      <Edit2 className="w-3 h-3 text-white" />
                    </button>
                    <button onClick={() => setConfirmDelete(root.id)} className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg" title="Delete">
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Branches spread horizontally */}
          {root.children.length > 0 && (
            <div className="flex flex-wrap gap-6 justify-center items-start">
              {root.children.map((branch, i) => (
                <motion.div
                  key={branch.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="relative"
                >
                  {/* Vertical connector from root */}
                  <div className="flex flex-col items-center">
                    <div className="w-[2px] h-4 rounded-full" style={{ background: getBranchColor(i).bg + '60' }} />
                    <div className="w-3 h-3 rounded-full -mt-1 mb-1" style={{ background: getBranchColor(i).bg, boxShadow: getBranchColor(i).glow }} />
                  </div>
                  {renderNodeBox(branch, 1, i)}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Multiple roots: render as separate trees
    return (
      <div className="flex flex-wrap gap-8 justify-center items-start">
        {nodes.map((root, i) => (
          <div key={root.id} className="flex flex-col items-center">
            {renderNodeBox(root, 0, i)}
          </div>
        ))}
      </div>
    );
  };

  const modal = open ? createPortal(
    <div className="fixed inset-0 overflow-hidden bg-black/70 backdrop-blur-sm" style={{ zIndex: 9999 }} onClick={() => { setOpen(false); playClose(); }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full h-full flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10" style={{ background: 'hsl(15, 5%, 6%)' }}>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="font-display text-sm text-gradient-fire font-bold">Mind Map</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setScale(s => Math.min(s + 0.2, 3))} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors" title="Zoom in">
              <ZoomIn className="w-4 h-4 text-white/60" />
            </button>
            <button onClick={() => setScale(s => Math.max(s - 0.2, 0.3))} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors" title="Zoom out">
              <ZoomOut className="w-4 h-4 text-white/60" />
            </button>
            <button onClick={resetView} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors" title="Reset view">
              <Maximize2 className="w-4 h-4 text-white/60" />
            </button>
            {nodes.length > 0 && (
              <button
                onClick={() => addNode(nodes.length === 1 ? nodes[0].id : null)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                style={{ background: '#FF6B3520', color: '#FF6B35', border: '1px solid #FF6B3540' }}
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            )}
            <button onClick={() => { setOpen(false); playClose(); }} className="w-7 h-7 rounded-full flex items-center justify-center hover:scale-110 transition-transform" style={{ background: 'hsl(0, 60%, 40%)' }}>
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
          style={{ background: 'radial-gradient(circle at 50% 50%, hsl(15, 5%, 10%) 0%, hsl(15, 5%, 5%) 100%)' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Grid dots background */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }} />

          <div
            className="flex items-center justify-center min-h-full p-8"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.2s ease-out',
            }}
          >
            {loaded && renderMindMapLayout()}
          </div>
        </div>
      </motion.div>

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
