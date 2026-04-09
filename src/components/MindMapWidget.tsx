import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Plus, Trash2, Edit2, Check, ZoomIn, ZoomOut, Maximize2, ChevronDown, ChevronRight, FileText, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ConfirmDialog from './ConfirmDialog';
import { playOpen, playClose, playClick, playDelete, playAddTask } from '@/lib/sounds';
import { useAppStore } from '@/lib/store';

interface MindMapNode {
  id: string;
  parentId: string | null;
  text: string;
  description: string;
  sectionId: string | null;
  sortOrder: number;
  children: MindMapNode[];
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
  const store = useAppStore();
  const [open, setOpen] = useState(false);
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedDescs, setExpandedDescs] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const sections = store.sections;

  useEffect(() => {
    if (!user || !open) return;
    const load = async () => {
      const { data } = await supabase.from('mind_map_nodes' as any).select('*').eq('user_id', user.id).order('sort_order');
      if (data) {
        const flat = (data as any[]).map(n => ({
          id: n.id, parentId: n.parent_id, text: n.text,
          description: n.description || '', sectionId: n.section_id || null,
          sortOrder: n.sort_order,
        }));
        setNodes(buildTree(flat));
      }
      setLoaded(true);
    };
    load();
  }, [user, open]);

  const buildTree = (flat: { id: string; parentId: string | null; text: string; description: string; sectionId: string | null; sortOrder: number }[]): MindMapNode[] => {
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
      user_id: user.id, parent_id: parentId, text: '', description: '', section_id: null, sort_order: siblings.length,
    } as any).select().single();
    if (inserted) {
      const n = inserted as any;
      const newNode: MindMapNode = { id: n.id, parentId: n.parent_id, text: '', description: '', sectionId: null, sortOrder: n.sort_order, children: [] };
      if (parentId) {
        setNodes(prev => addChild(prev, parentId, newNode));
      } else {
        setNodes(prev => [...prev, newNode]);
      }
      setEditingId(n.id);
      setEditText('');
      setEditDesc('');
      setEditSectionId(null);
      playAddTask();
    }
  };

  const addChild = (tree: MindMapNode[], parentId: string, child: MindMapNode): MindMapNode[] =>
    tree.map(n => n.id === parentId ? { ...n, children: [...n.children, child] } : { ...n, children: addChild(n.children, parentId, child) });

  const updateNode = async (id: string, text: string, description: string, sectionId: string | null) => {
    await supabase.from('mind_map_nodes' as any).update({ text, description, section_id: sectionId } as any).eq('id', id);
    setNodes(prev => mapTree(prev, id, n => ({ ...n, text, description, sectionId })));
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

  const toggleDesc = (id: string) => {
    setExpandedDescs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Canvas pan handlers - only on canvas area, not header
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest('[data-node]') || el.closest('button') || el.closest('input') || el.closest('textarea') || el.closest('select')) return;
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

  const getSectionName = (sectionId: string | null) => {
    if (!sectionId) return null;
    return sections.find(s => s.id === sectionId)?.name || null;
  };

  const getSectionColor = (sectionId: string | null) => {
    if (!sectionId) return null;
    return sections.find(s => s.id === sectionId)?.color || null;
  };

  // Render a single node box
  const renderNodeBox = (node: MindMapNode, depth: number, branchIndex: number) => {
    const color = getBranchColor(branchIndex);
    const isRoot = depth === 0;
    const isEditing = editingId === node.id;
    const hasDesc = !!node.description;
    const isDescExpanded = expandedDescs.has(node.id);
    const sectionName = getSectionName(node.sectionId);
    const sectionColor = getSectionColor(node.sectionId);

    return (
      <div data-node className="relative" key={node.id}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: depth * 0.05 }}
          className={`group relative ${isRoot ? 'min-w-[160px] max-w-[260px]' : 'min-w-[120px] max-w-[220px]'}`}
        >
          {/* Node card */}
          <div
            className={`relative rounded-2xl border-2 transition-all ${isRoot ? 'px-4 py-3' : 'px-3 py-2'}`}
            style={{
              background: isRoot
                ? `linear-gradient(135deg, ${color.bg}, ${color.bg}CC)`
                : `linear-gradient(135deg, ${color.bg}18, ${color.bg}08)`,
              borderColor: isRoot ? `${color.bg}` : `${color.bg}50`,
              boxShadow: isRoot ? color.glow : `0 2px 8px ${color.bg}15`,
            }}
          >
            {isEditing ? (
              <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                <input
                  autoFocus
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && editText.trim()) updateNode(node.id, editText.trim(), editDesc, editSectionId);
                    if (e.key === 'Escape') { if (!node.text) deleteNode(node.id); else setEditingId(null); }
                  }}
                  className={`w-full bg-black/30 border border-white/20 rounded-lg px-2 py-1 text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 ${isRoot ? 'text-sm' : 'text-xs'}`}
                  placeholder="Topic..."
                />
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/40 resize-none"
                  placeholder="Description (optional)..."
                  rows={2}
                />
                {/* Section selector */}
                <select
                  value={editSectionId || ''}
                  onChange={e => setEditSectionId(e.target.value || null)}
                  className="w-full bg-black/30 border border-white/15 rounded-lg px-2 py-1 text-xs text-white/80 focus:outline-none"
                >
                  <option value="">No section</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => { if (editText.trim()) updateNode(node.id, editText.trim(), editDesc, editSectionId); else deleteNode(node.id); }}
                    className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/20 hover:bg-white/30 shrink-0"
                  >
                    <Check className="w-3 h-3 text-white" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-start gap-1.5">
                  {/* Expand description toggle */}
                  {hasDesc && (
                    <button onClick={() => toggleDesc(node.id)} className="mt-0.5 shrink-0 w-4 h-4 flex items-center justify-center">
                      {isDescExpanded ? <ChevronDown className="w-3 h-3" style={{ color: isRoot ? '#fff' : color.bg }} /> : <ChevronRight className="w-3 h-3" style={{ color: isRoot ? '#fff' : color.bg }} />}
                    </button>
                  )}
                  <span
                    className={`flex-1 select-none leading-tight ${isRoot ? 'text-sm font-bold' : 'text-xs font-semibold'}`}
                    style={{ color: isRoot ? '#fff' : color.bg }}
                    onDoubleClick={() => { setEditingId(node.id); setEditText(node.text); setEditDesc(node.description); setEditSectionId(node.sectionId); }}
                  >
                    {node.text || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Empty</span>}
                  </span>
                </div>
                {/* Section badge */}
                {sectionName && (
                  <div className="flex items-center gap-1 ml-0.5">
                    <Tag className="w-2.5 h-2.5" style={{ color: sectionColor || color.bg }} />
                    <span className="text-[9px] font-medium" style={{ color: sectionColor || color.bg }}>{sectionName}</span>
                  </div>
                )}
                {/* Description */}
                <AnimatePresence>
                  {isDescExpanded && hasDesc && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-[10px] leading-relaxed mt-1 px-0.5" style={{ color: isRoot ? 'rgba(255,255,255,0.75)' : `${color.bg}AA` }}>
                        {node.description}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Action buttons - always visible on mobile (touch), hover on desktop */}
            {!isEditing && (
              <div className="absolute -top-2.5 -right-2.5 flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); addNode(node.id); }}
                  className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                  style={{ background: color.bg }}
                  title="Add child"
                >
                  <Plus className="w-3 h-3 text-white" />
                </button>
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setEditingId(node.id); setEditText(node.text); setEditDesc(node.description); setEditSectionId(node.sectionId); }}
                  className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                  style={{ background: color.bg }}
                  title="Edit"
                >
                  <Edit2 className="w-2.5 h-2.5 text-white" />
                </button>
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setConfirmDelete(node.id); }}
                  className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg bg-red-500 active:scale-90 transition-transform"
                  title="Delete"
                >
                  <Trash2 className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Children */}
        {node.children.length > 0 && (
          <div className="flex flex-col gap-2 mt-2 pl-5 relative">
            <div
              className="absolute left-[8px] top-0 bottom-0 w-[2px] rounded-full"
              style={{ background: `${color.bg}30` }}
            />
            {node.children.map((child) => (
              <div key={child.id} className="relative flex items-start">
                <div
                  className="absolute left-[-12px] top-[12px] w-[12px] h-[2px] rounded-full"
                  style={{ background: `${color.bg}50` }}
                />
                <div
                  className="absolute left-[-16px] top-[9px] w-[7px] h-[7px] rounded-full"
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

  const renderMindMapLayout = () => {
    if (nodes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B3530, #FF6B3510)', border: '2px dashed #FF6B3540' }}>
            <Brain className="w-8 h-8" style={{ color: '#FF6B3580' }} />
          </div>
          <p className="text-muted-foreground text-sm text-center">Start your mind map<br />by adding a central idea</p>
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

    if (nodes.length === 1) {
      const root = nodes[0];
      const sectionName = getSectionName(root.sectionId);
      const sectionColor = getSectionColor(root.sectionId);
      return (
        <div className="flex flex-col items-center gap-6 min-w-max">
          <div data-node className="relative">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="group relative"
            >
              <div
                className="relative rounded-2xl border-2 px-6 py-4 min-w-[180px] max-w-[280px] text-center"
                style={{
                  background: 'linear-gradient(135deg, #FF6B35, #E85D20)',
                  borderColor: '#FF6B35',
                  boxShadow: '0 0 30px #FF6B3550, 0 8px 32px #FF6B3530',
                }}
              >
                {editingId === root.id ? (
                  <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && editText.trim()) updateNode(root.id, editText.trim(), editDesc, editSectionId);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="bg-black/30 border border-white/30 rounded-lg px-3 py-1 text-sm text-white placeholder:text-white/40 focus:outline-none text-center"
                      placeholder="Central idea..."
                    />
                    <textarea
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      className="bg-black/20 border border-white/15 rounded-lg px-2 py-1 text-xs text-white/80 placeholder:text-white/25 focus:outline-none resize-none text-center"
                      placeholder="Description..."
                      rows={2}
                    />
                    <select
                      value={editSectionId || ''}
                      onChange={e => setEditSectionId(e.target.value || null)}
                      className="bg-black/30 border border-white/15 rounded-lg px-2 py-1 text-xs text-white/80 focus:outline-none"
                    >
                      <option value="">No section</option>
                      {sections.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button onClick={() => { if (editText.trim()) updateNode(root.id, editText.trim(), editDesc, editSectionId); }} className="w-6 h-6 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center mx-auto">
                      <Check className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className="text-base font-bold text-white cursor-pointer"
                      onDoubleClick={() => { setEditingId(root.id); setEditText(root.text); setEditDesc(root.description); setEditSectionId(root.sectionId); }}
                    >
                      {root.text || <span className="opacity-40 italic">Central idea</span>}
                    </span>
                    {sectionName && (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: `${sectionColor || '#FF6B35'}30`, color: sectionColor || '#fff' }}>{sectionName}</span>
                    )}
                    {root.description && (
                      <p className="text-[10px] text-white/70 mt-0.5 leading-relaxed">{root.description}</p>
                    )}
                  </div>
                )}

                {editingId !== root.id && (
                  <div className="absolute -top-3 -right-3 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
                    <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); addNode(root.id); }} className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-lg active:scale-90" title="Add branch">
                      <Plus className="w-3 h-3 text-white" />
                    </button>
                    <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setEditingId(root.id); setEditText(root.text); setEditDesc(root.description); setEditSectionId(root.sectionId); }} className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-lg active:scale-90" title="Edit">
                      <Edit2 className="w-3 h-3 text-white" />
                    </button>
                    <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setConfirmDelete(root.id); }} className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg active:scale-90" title="Delete">
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

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

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen(false);
    playClose();
  };

  const modal = open ? createPortal(
    <div className="fixed inset-0 overflow-hidden bg-black/70 backdrop-blur-sm" style={{ zIndex: 9999 }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full h-full flex flex-col"
      >
        {/* Header - NOT part of pannable canvas */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 shrink-0" style={{ background: 'hsl(15, 5%, 6%)' }}>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="font-display text-sm text-gradient-fire font-bold">Mind Map</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setScale(s => Math.min(s + 0.2, 3))} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors">
              <ZoomIn className="w-4 h-4 text-white/60" />
            </button>
            <button onClick={() => setScale(s => Math.max(s - 0.2, 0.3))} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors">
              <ZoomOut className="w-4 h-4 text-white/60" />
            </button>
            <button onClick={resetView} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors">
              <Maximize2 className="w-4 h-4 text-white/60" />
            </button>
            {nodes.length > 0 && (
              <button
                onClick={() => addNode(nodes.length === 1 ? nodes[0].id : null)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                style={{ background: '#FF6B3520', color: '#FF6B35', border: '1px solid #FF6B3540' }}
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            )}
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform ml-1"
              style={{ background: 'hsl(0, 60%, 40%)' }}
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Canvas - pannable area */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-hidden relative touch-none"
          style={{ background: 'radial-gradient(circle at 50% 50%, hsl(15, 5%, 10%) 0%, hsl(15, 5%, 5%) 100%)', cursor: isPanning ? 'grabbing' : 'grab' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }} />

          <div
            className="flex items-center justify-center min-h-full p-6"
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
