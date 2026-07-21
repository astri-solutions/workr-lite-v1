import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';

const FRAME_SIZE = 260;  // on-screen crop frame, in CSS px

interface Props {
  file: File;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
  title?: string;
  outputSize?: number; // exported square size in px (rendered above the on-screen target for crisp downscaling)
  hint?: string;
}

export default function FaviconCropModal({
  file, onCancel, onConfirm,
  title = 'Recortar favicon',
  outputSize = 256,
  hint,
}: Props) {
  const OUTPUT_SIZE = outputSize;
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    const img = new Image();
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Base scale so the shorter image side exactly fills the crop frame at zoom=1
  const baseScale = imgSize.w && imgSize.h ? FRAME_SIZE / Math.min(imgSize.w, imgSize.h) : 1;
  const scale = baseScale * zoom;
  const displayW = imgSize.w * scale;
  const displayH = imgSize.h * scale;

  function clampOffset(x: number, y: number) {
    const maxX = Math.max(0, (displayW - FRAME_SIZE) / 2);
    const maxY = Math.max(0, (displayH - FRAME_SIZE) / 2);
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

    // Map the on-screen FRAME_SIZE crop window back to source-image pixels.
    const srcScale = scale; // display px per source px
    const cropSrcSize = FRAME_SIZE / srcScale;
    const centerSrcX = imgSize.w / 2 - offset.x / srcScale;
    const centerSrcY = imgSize.h / 2 - offset.y / srcScale;
    const srcX = centerSrcX - cropSrcSize / 2;
    const srcY = centerSrcY - cropSrcSize / 2;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, srcX, srcY, cropSrcSize, cropSrcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    onConfirm(canvas.toDataURL('image/png'));
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
        {hint ?? `Ajuste a área que será usada. Apenas a região dentro do quadro é exportada, gerando um arquivo PNG de ${OUTPUT_SIZE}×${OUTPUT_SIZE}px (nítido em telas retina).`}
      </p>
      <div
        ref={stageRef}
        style={{
          position: 'relative',
          width: FRAME_SIZE,
          height: FRAME_SIZE,
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
