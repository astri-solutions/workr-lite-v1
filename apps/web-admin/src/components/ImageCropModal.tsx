import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';

interface Props {
  file: File;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
  title?: string;
  hint?: string;
  /** On-screen crop frame size, in CSS px. */
  frameWidth?: number;
  frameHeight?: number;
  /** Exported bitmap size, in px — rendered above the on-screen frame for crisp downscaling. */
  outputWidth?: number;
  outputHeight?: number;
}

/** Generic rectangular-crop modal (drag to reposition, slider to zoom) — same
 * interaction as FaviconCropModal, generalized beyond a square frame so it
 * can crop to any aspect ratio (e.g. a wide banner slide). */
export default function ImageCropModal({
  file, onCancel, onConfirm,
  title = 'Recortar imagem',
  hint,
  frameWidth = 480,
  frameHeight = 480,
  outputWidth = 1600,
  outputHeight = 1600,
}: Props) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    const img = new Image();
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Base scale so the image always covers the whole frame (no gaps) at zoom=1.
  const baseScale = imgSize.w && imgSize.h
    ? Math.max(frameWidth / imgSize.w, frameHeight / imgSize.h)
    : 1;
  const scale = baseScale * zoom;
  const displayW = imgSize.w * scale;
  const displayH = imgSize.h * scale;

  function clampOffset(x: number, y: number) {
    const maxX = Math.max(0, (displayW - frameWidth) / 2);
    const maxY = Math.max(0, (displayH - frameHeight) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y };
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clampOffset(dragRef.current.origX + dx, dragRef.current.origY + dy));
  }
  function handlePointerUp() { dragRef.current = null; }

  function handleZoomChange(next: number) {
    setZoom(next);
    setOffset(o => clampOffset(o.x, o.y));
  }

  async function confirmCrop() {
    if (!imgUrl || !imgSize.w) return;
    const img = new Image();
    img.src = imgUrl;
    await new Promise(r => { img.onload = r; });

    // Map the on-screen frame back to source-image pixels.
    const cropSrcW = frameWidth / scale;
    const cropSrcH = frameHeight / scale;
    const centerSrcX = imgSize.w / 2 - offset.x / scale;
    const centerSrcY = imgSize.h / 2 - offset.y / scale;
    const srcX = centerSrcX - cropSrcW / 2;
    const srcY = centerSrcY - cropSrcH / 2;

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, srcX, srcY, cropSrcW, cropSrcH, 0, 0, outputWidth, outputHeight);

    onConfirm(canvas.toDataURL('image/jpeg', 0.92));
  }

  return (
    <Modal
      open
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <div className="modal-footer">
          <button type="button" className="btn-outline" onClick={onCancel}>Cancelar</button>
          <button type="button" className="btn-primary" onClick={confirmCrop} disabled={!imgUrl}>Usar recorte</button>
        </div>
      }
    >
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-3)' }}>
        {hint ?? 'Ajuste a área que será usada — arraste para reposicionar e use o zoom para enquadrar.'}
      </p>
      <div
        style={{
          position: 'relative',
          width: frameWidth,
          height: frameHeight,
          maxWidth: '100%',
          margin: '0 auto',
          overflow: 'hidden',
          borderRadius: 8,
          background: 'repeating-conic-gradient(#e5e7eb 0% 25%, #f4f4f4 0% 50%) 50% / 16px 16px',
          cursor: 'grab',
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {imgUrl && (
          <img
            src={imgUrl}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: displayW,
              height: displayH,
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          border: '2px solid var(--color-primary, #0B5B68)',
          borderRadius: 8,
          pointerEvents: 'none',
        }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>Zoom</span>
        <input
          type="range" min="1" max="3" step="0.01"
          value={zoom}
          onChange={e => handleZoomChange(Number(e.target.value))}
          style={{ flex: 1 }}
        />
      </div>
    </Modal>
  );
}
