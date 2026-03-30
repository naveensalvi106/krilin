import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Image, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Sticker {
  name: string;
  url: string;
}

export function useStickers() {
  const { user } = useAuth();
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(false);

  const loadStickers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.storage
      .from('stickers')
      .list(user.id, { limit: 100 });
    if (data && !error) {
      const items = data
        .filter(f => f.name.match(/\.(png|jpg|jpeg|webp|gif)$/i))
        .map(f => ({
          name: f.name,
          url: supabase.storage.from('stickers').getPublicUrl(`${user.id}/${f.name}`).data.publicUrl,
        }));
      setStickers(items);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadStickers(); }, [loadStickers]);

  const uploadSticker = useCallback(async (file: File) => {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Max 2MB.');
      return;
    }
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const { error } = await supabase.storage
      .from('stickers')
      .upload(`${user.id}/${safeName}`, file, { contentType: file.type });
    if (error) {
      toast.error('Upload failed');
      console.error(error);
    } else {
      toast.success('Sticker uploaded!');
      await loadStickers();
    }
  }, [user, loadStickers]);

  const deleteSticker = useCallback(async (name: string) => {
    if (!user) return;
    await supabase.storage.from('stickers').remove([`${user.id}/${name}`]);
    setStickers(s => s.filter(st => st.name !== name));
    toast.success('Sticker deleted');
  }, [user]);

  return { stickers, loading, uploadSticker, deleteSticker, loadStickers };
}

interface StickerManagerProps {
  stickers: Sticker[];
  loading: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: (name: string) => Promise<void>;
}

const StickerManager = ({ stickers, loading, onUpload, onDelete }: StickerManagerProps) => {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      await onUpload(file);
    }
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground font-medium">My Stickers</p>
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg hover:scale-105 transition-transform"
            style={{ background: 'linear-gradient(135deg, hsl(30, 100%, 55%), hsl(5, 85%, 48%))' }}>
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Upload
          </span>
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : stickers.length === 0 ? (
        <p className="text-xs text-muted-foreground italic text-center py-2">No stickers yet. Upload PNGs to use as task icons!</p>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {stickers.map(s => (
            <div key={s.name} className="relative group">
              <img
                src={s.url}
                alt={s.name}
                className="w-10 h-10 object-contain rounded-lg border border-border p-0.5"
                style={{ background: 'hsl(15, 10%, 10%)' }}
              />
              <button
                onClick={() => onDelete(s.name)}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'hsl(0, 60%, 45%)' }}
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StickerManager;
