import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import './ColorPickerPopover.css';

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const v = max;
  const s = max === 0 ? 0 : (max - min) / max;
  let h = 0;
  if (max !== min) {
    if (max === r) h = ((g - b) / (max - min) + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / (max - min) + 2) / 6;
    else h = ((r - g) / (max - min) + 4) / 6;
  }
  return [h * 360, s * 100, v * 100];
}

function hsvToHex(h: number, s: number, v: number): string {
  h = h / 360; s = s / 100; v = v / 100;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

export default function ColorPickerPopover({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const [hsv, setHsv] = useState<[number, number, number]>(() =>
    /^#[0-9a-fA-F]{6}$/.test(value) ? hexToHsv(value) : [210, 87, 41]
  );
  const [hexInput, setHexInput] = useState(value);
  const swatchRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<'sv' | 'hue' | null>(null);
  // Keep hsv in a ref so mousemove handler always sees fresh value
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  // Fallback usado só na primeira chamada (antes do popover existir no DOM
  // para medir de verdade) — precisava ficar em sincronia manual com o CSS
  // e desviava sempre que .cp-popover mudava de padding/gap/conteúdo. Assim
  // que o popover monta, `useLayoutEffect` abaixo re-mede o retângulo real
  // via popoverRef e recalcula, então esses números só importam por um
  // frame (evita o painel "piscar" na posição errada antes de corrigir).
  const CP_W = 240;
  const CP_H = 260;
  const GAP = 8;

  const calcPosition = useCallback((measured?: { w: number; h: number }) => {
    if (!swatchRef.current) return;
    const w = measured?.w ?? CP_W;
    const h = measured?.h ?? CP_H;
    const rect = swatchRef.current.getBoundingClientRect();
    const left = Math.max(GAP, Math.min(rect.left, window.innerWidth - w - GAP));
    // Abre para baixo; se não couber, vira para cima da amostra.
    const top = rect.bottom + GAP + h > window.innerHeight && rect.top - GAP - h > 0
      ? rect.top - GAP - h
      : Math.min(rect.bottom + GAP, window.innerHeight - h - GAP);
    setPopoverPos({ top: Math.max(GAP, top), left });
  }, []);

  // Re-mede contra o tamanho REAL do popover assim que ele existe no DOM —
  // corrige qualquer desvio entre CP_W/CP_H e o CSS de fato, permanentemente,
  // em vez de depender de manter duas fontes de verdade sincronizadas.
  useLayoutEffect(() => {
    if (!open || !popoverRef.current) return;
    const { width, height } = popoverRef.current.getBoundingClientRect();
    calcPosition({ w: width, h: height });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // `position: fixed` congela o painel na tela: sem isto ele descola da
  // amostra assim que a coluna do editor rola.
  useEffect(() => {
    if (!open) return;
    const onReflow = () => calcPosition();
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [open, calcPosition]);

  useEffect(() => {
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      setHsv(hexToHsv(value));
      setHexInput(value);
    }
  }, [value]);

  // Close on click outside — but only when not dragging
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (dragging.current) return;
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        swatchRef.current && !swatchRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Global drag handlers
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      e.preventDefault();
      const [h, , ] = hsvRef.current;
      if (dragging.current === 'sv' && svRef.current) {
        const rect = svRef.current.getBoundingClientRect();
        const s = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
        const v = Math.min(100, Math.max(0, (1 - (e.clientY - rect.top) / rect.height) * 100));
        const next: [number, number, number] = [h, s, v];
        setHsv(next);
        const hex = hsvToHex(...next);
        setHexInput(hex);
        onChange(hex);
      } else if (dragging.current === 'hue' && hueRef.current) {
        const rect = hueRef.current.getBoundingClientRect();
        const newH = Math.min(360, Math.max(0, ((e.clientX - rect.left) / rect.width) * 360));
        const [, s, v] = hsvRef.current;
        const next: [number, number, number] = [newH, s, v];
        setHsv(next);
        const hex = hsvToHex(...next);
        setHexInput(hex);
        onChange(hex);
      }
    }
    function onUp() {
      dragging.current = null;
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [onChange]);

  const hueColor = hsvToHex(hsv[0], 100, 100);
  const currentHex = hsvToHex(...hsv);

  function startSvDrag(e: React.MouseEvent) {
    e.preventDefault();
    dragging.current = 'sv';
    const rect = svRef.current!.getBoundingClientRect();
    const s = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const v = Math.min(100, Math.max(0, (1 - (e.clientY - rect.top) / rect.height) * 100));
    const next: [number, number, number] = [hsv[0], s, v];
    setHsv(next);
    const hex = hsvToHex(...next);
    setHexInput(hex);
    onChange(hex);
  }

  function startHueDrag(e: React.MouseEvent) {
    e.preventDefault();
    dragging.current = 'hue';
    const rect = hueRef.current!.getBoundingClientRect();
    const newH = Math.min(360, Math.max(0, ((e.clientX - rect.left) / rect.width) * 360));
    const next: [number, number, number] = [newH, hsv[1], hsv[2]];
    setHsv(next);
    const hex = hsvToHex(...next);
    setHexInput(hex);
    onChange(hex);
  }

  return (
    <div className="cp-wrap">
      <button
        ref={swatchRef}
        type="button"
        className="cp-swatch"
        style={{ background: currentHex }}
        onClick={() => {
          if (!open) calcPosition();
          setOpen(o => !o);
        }}
      />
      {open && (
        <div
          ref={popoverRef}
          className="cp-popover"
          style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left }}
          onMouseDown={e => e.stopPropagation()}
        >
          {/* Saturation / Value square */}
          <div
            ref={svRef}
            className="cp-sv"
            style={{ background: hueColor }}
            onMouseDown={startSvDrag}
          >
            <div className="cp-sv__white" />
            <div className="cp-sv__black" />
            <div
              className="cp-sv__cursor"
              style={{ left: `${hsv[1]}%`, top: `${100 - hsv[2]}%` }}
            />
          </div>

          {/* Hue bar */}
          <div
            ref={hueRef}
            className="cp-hue"
            onMouseDown={startHueDrag}
          >
            <div
              className="cp-hue__cursor"
              style={{ left: `${(hsv[0] / 360) * 100}%` }}
            />
          </div>

          {/* Hex input */}
          <div className="cp-hex-row">
            <div className="cp-hex-preview" style={{ background: currentHex }} />
            <input
              className="cp-hex-input"
              type="text"
              value={hexInput}
              maxLength={7}
              spellCheck={false}
              onChange={e => {
                const v = e.target.value;
                setHexInput(v);
                if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                  setHsv(hexToHsv(v));
                  onChange(v);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
