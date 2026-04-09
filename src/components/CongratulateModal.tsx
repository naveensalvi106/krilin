import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { PartyPopper, X, Plus, Sparkles, Pencil, ImagePlus } from 'lucide-react';
import type { Visualization } from '@/lib/store';
import ConfirmDialog from './ConfirmDialog';
import { playClick, playDelete } from '@/lib/sounds';

interface CongratulateModalProps {
  open: boolean;
  onClose: () => void;
  taskTitle: string;
  taskId: string;
  visualizations: Visualization[];
  onAddVisualization: (text: string, image?: string, taskId?: string) => void;
  onRemoveVisualization: (id: string) => void;
}

const CongratulateModal = ({ open, onClose, taskTitle, taskId, visualizations, onAddVisualization, onRemoveVisualization }: CongratulateModalProps) => {
  const [editing, setEditing] = useState(false);
  const [newText, setNewText] = useState('');
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [viewImg, setViewImg] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setEditing(false);
    setNewText('');
    setPreviewImg(null);
    setViewImg(null);
    onClose();
  };

  const handleAdd = () => {
    if (newText.trim() || previewImg) {
      onAddVisualization(newText.trim() || 'Vision Board Image', previewImg || undefined, taskId);
      setNewText('');
      setPreviewImg(null);
      playClick();
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

  const hasImages = visualizations.some(v => v.image);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative mx-4 w-full rounded-2xl overflow-hidden"
        style={{
          maxWidth: hasImages ? '420px' : '380px',
          background: 'linear-gradient(145deg, hsl(35 80% 22%), hsl(25 70% 15%))',
          border: '1px solid hsl(40 80% 35%)',
          boxShadow: '0 0 40px hsl(30 100% 50% / 0.15), 0 20px 60px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

        {/* Edit button - top left */}
        <button
          onClick={() => setEditing(!editing)}
          className="absolute top-3 left-3 z-10 w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
          style={{
            background: editing
              ? 'rgba(150,220,255,0.3)'
              : 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        >
          <Pencil className="w-4 h-4 text-white" />
        </button>

        {/* Close button - top right */}
        <button onClick={handleClose} className="absolute top-3 right-3 z-10 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pt-14 space-y-4">
          {/* Congrats header */}
          <div className="text-center space-y-2">
            <PartyPopper className="w-10 h-10 mx-auto icon-glow text-primary" />
            <h2 className="text-xl font-display text-gradient-fire">Incredible!</h2>
            <p className="text-muted-foreground text-sm">You completed: <span className="text-foreground font-medium">"{taskTitle}"</span></p>
          </div>

          {/* Visualizations - images shown large */}
          {visualizations.length > 0 && (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {visualizations.map((v) => (
                <div key={v.id} className="relative">
                  {v.image && (
                    <img
                      src={v.image}
                      alt="Vision"
                      className="w-full rounded-xl object-contain cursor-pointer hover:scale-[1.02] transition-transform"
                      style={{ maxHeight: '300px' }}
                      onClick={() => setViewImg(v.image)}
                    />
                  )}
                  {v.text && v.text !== 'Vision Board Image' && (
                    <div
                      className="rounded-xl px-4 py-3 flex items-center gap-2"
                      style={{
                        background: 'rgba(255,255,255,0.12)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        marginTop: v.image ? '8px' : '0',
                      }}
                    >
                      <Sparkles className="w-4 h-4 text-white shrink-0" />
                      <span className="text-white font-medium text-sm">{v.text}</span>
                    </div>
                  )}
                  {editing && (
                    <button
                      onClick={() => setConfirmRemoveId(v.id)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center bg-destructive text-destructive-foreground shadow-lg"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Text-only visualizations as gradient boxes */}
          {visualizations.length === 0 && !editing && (
            <p className="text-sm text-muted-foreground text-center py-2">
              <Sparkles className="w-4 h-4 inline mr-1" />
              Tap the ✏️ to add your vision for this task
            </p>
          )}

          {/* Editing controls */}
          {editing && (
            <div className="space-y-2">
              {previewImg && (
                <div className="relative inline-block">
                  <img src={previewImg} alt="Preview" className="max-w-full max-h-[120px] rounded-lg object-contain" />
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

          {/* Close button */}
          <button onClick={handleClose} className="btn-premium text-primary-foreground w-full py-3 text-sm">
            Keep Going 🔥
          </button>
        </div>

        {/* Full image viewer */}
        {viewImg && (
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center" onClick={() => setViewImg(null)}>
            <button onClick={() => setViewImg(null)} className="absolute top-4 right-4 text-white"><X className="w-6 h-6" /></button>
            <img src={viewImg} alt="Vision" className="max-w-full max-h-full object-contain rounded-xl" />
          </div>
        )}
      </motion.div>

      <ConfirmDialog
        open={!!confirmRemoveId}
        onConfirm={() => { if (confirmRemoveId) onRemoveVisualization(confirmRemoveId); setConfirmRemoveId(null); }}
        onCancel={() => setConfirmRemoveId(null)}
        title="Remove Visualization?"
        description="Are you sure you want to remove this visualization?"
      />
    </div>
  );
};

export default CongratulateModal;
