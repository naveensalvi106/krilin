import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { PartyPopper, Eye, X, Plus, Sparkles, Settings, ImagePlus } from 'lucide-react';
import type { Visualization } from '@/lib/store';

interface CongratulateModalProps {
  open: boolean;
  onClose: () => void;
  taskTitle: string;
  visualizations: Visualization[];
  onAddVisualization: (text: string, image?: string) => void;
  onRemoveVisualization: (id: string) => void;
}

const CongratulateModal = ({ open, onClose, taskTitle, visualizations, onAddVisualization, onRemoveVisualization }: CongratulateModalProps) => {
  const [phase, setPhase] = useState<'congrats' | 'visualize'>('congrats');
  const [editing, setEditing] = useState(false);
  const [newText, setNewText] = useState('');
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [viewImg, setViewImg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setPhase('congrats');
    setEditing(false);
    setNewText('');
    setPreviewImg(null);
    setViewImg(null);
    onClose();
  };

  const handleAdd = () => {
    if (newText.trim() || previewImg) {
      onAddVisualization(newText.trim() || 'Vision Board Image', previewImg || undefined);
      setNewText('');
      setPreviewImg(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreviewImg(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-panel-accent bevel relative p-8 max-w-sm w-full mx-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

        <button onClick={handleClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>

        {phase === 'congrats' ? (
          <div className="space-y-4">
            <PartyPopper className="w-12 h-12 mx-auto icon-glow text-primary" />
            <h2 className="text-xl font-display text-gradient-fire">Incredible!</h2>
            <p className="text-muted-foreground">You completed:</p>
            <p className="text-foreground font-medium">"{taskTitle}"</p>
            <button onClick={() => setPhase('visualize')} className="btn-premium text-primary-foreground flex items-center gap-2 mx-auto">
              <Eye className="w-4 h-4" />
              Visualize Your Future
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display text-gradient-fire">See The Bigger Picture</h2>
              <button
                onClick={() => setEditing(!editing)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                style={{
                  background: editing
                    ? 'linear-gradient(135deg, hsl(30 100% 55%), hsl(5 85% 48%))'
                    : 'hsl(var(--muted))',
                  border: editing ? 'none' : '1px solid hsl(var(--border))',
                }}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {visualizations.map((v) => (
                <div key={v.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/70">
                  {v.image && (
                    <img
                      src={v.image}
                      alt="Vision"
                      className="max-w-[120px] max-h-[80px] rounded-lg object-contain cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setViewImg(v.image)}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <Sparkles className="w-3 h-3 inline mr-1 icon-glow" />
                    <span className="text-sm">{v.text}</span>
                  </div>
                  {editing && (
                    <button
                      onClick={() => onRemoveVisualization(v.id)}
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-destructive text-destructive-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {visualizations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  <Sparkles className="w-4 h-4 inline mr-1" />
                  No visualizations yet. Tap ⚙️ to add some.
                </p>
              )}
            </div>

            {editing && (
              <div className="space-y-2">
                {previewImg && (
                  <div className="relative inline-block">
                    <img src={previewImg} alt="Preview" className="max-w-[120px] max-h-[80px] rounded-lg object-contain" />
                    <button
                      onClick={() => setPreviewImg(null)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-destructive text-destructive-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="Add a visualization..."
                    className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                  <button onClick={() => fileRef.current?.click()} className="w-8 h-8 solid-circle shrink-0 hover:scale-110 transition-transform">
                    <ImagePlus className="w-4 h-4" />
                  </button>
                  <button onClick={handleAdd} className="w-8 h-8 solid-circle shrink-0 hover:scale-110 transition-transform">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <button onClick={handleClose} className="btn-premium text-primary-foreground w-full py-3 text-sm">
              Keep Going 🔥
            </button>
          </div>
        )}

        {viewImg && (
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center" onClick={() => setViewImg(null)}>
            <button onClick={() => setViewImg(null)} className="absolute top-4 right-4 text-white"><X className="w-6 h-6" /></button>
            <img src={viewImg} alt="Vision" className="max-w-full max-h-full object-contain rounded-xl" />
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default CongratulateModal;
