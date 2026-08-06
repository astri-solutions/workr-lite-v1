import { useEffect, useState } from 'react';
import Modal from './Modal';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import './MediaPicker.css';

const MEDIA_BUCKET = 'portal-media';

interface MediaItem {
  id: string;
  name: string;
  url: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  portalDbId: string | null;
}

// Every image-upload point in the app used to only offer "upload a new file
// from your computer" — even when the exact image someone wants was already
// sitting in Biblioteca de Mídia (a logo reused as a section image, a photo
// already uploaded for one matéria wanted in another, etc.), forcing a
// redundant re-upload every time. This modal lists that same portal_media
// table (images only) and hands back a public URL a caller can drop
// straight into whatever `onChange(url)` it already had for uploads.
export default function MediaPicker({ open, onClose, onSelect, portalDbId }: Props) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !portalDbId || !isSupabaseConfigured || !supabase) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    supabase
      .from('portal_media')
      .select('id, name, file_path, external_url, type')
      .eq('portal_id', portalDbId)
      .eq('type', 'image')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) { setError('Não foi possível carregar a Biblioteca de Mídia.'); setLoading(false); return; }
        const mapped: MediaItem[] = (data ?? []).map((r: Record<string, unknown>) => {
          const filePath = r.file_path as string | null;
          const url = filePath
            ? supabase!.storage.from(MEDIA_BUCKET).getPublicUrl(filePath).data.publicUrl
            : (r.external_url as string | null) ?? '';
          return { id: r.id as string, name: r.name as string, url };
        }).filter(m => m.url);
        setItems(mapped);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, portalDbId]);

  return (
    <Modal open={open} onClose={onClose} title="Escolher da Biblioteca de Mídia" size="lg">
      {loading ? (
        <p className="media-picker__empty">Carregando…</p>
      ) : error ? (
        <p className="media-picker__empty media-picker__empty--error">{error}</p>
      ) : items.length === 0 ? (
        <p className="media-picker__empty">Nenhuma imagem na Biblioteca de Mídia ainda — envie uma pela página Mídia primeiro.</p>
      ) : (
        <div className="media-picker__grid">
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              className="media-picker__item"
              title={item.name}
              onClick={() => { onSelect(item.url); onClose(); }}
            >
              <img src={item.url} alt={item.name} className="media-picker__thumb" />
              <span className="media-picker__name">{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
