import { useState, useRef, useEffect } from 'react';
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
  const [hsv, setHsv] = useState<[number, number, number]>(() =>
    /^#[0-9a-fA-F]{6}$/.test(value) ? hexToHsv(value) : [210, 87, 41]
  );
  const [hexInput, setHexInput] = useState(value);
  const popoverRef = useRef<HTMLDivElement>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<'sv' | 'hue' | null>(null);
  // Keep hsv in a ref so mousemove handler always sees fresh value
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

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
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
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
    <div className="cp-wrap" ref={popoverRef}>
      <button
        type="button"
        className="cp-swatch"
        style={{ background: currentHex }}
        onClick={() => setOpen(o => !o)}
      />
      {open && (
        <div className="cp-popover">
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
