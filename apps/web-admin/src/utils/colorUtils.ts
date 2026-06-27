/**
 * Generates a 50–900 color scale from a single hex color (the 500 step).
 *
 * Lighter shades (50–400): interpolate H and L toward a near-white HSL value
 * while gently reducing saturation.
 * Darker shades (600–900): keep H and S, reduce L toward near-black.
 */

function hexToHsl(hex: string): [number, number, number] | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;

  if (d === 0) return [0, 0, Math.round(l * 100)];

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export type ColorScale = Record<number, string>;

/**
 * Returns a 10-step scale (50, 100…900) as CSS hsl() strings.
 * The 500 step is returned as the original hex value.
 */
export function generateColorScale(hex: string): ColorScale {
  const hsl = hexToHsl(hex);
  if (!hsl) return {};

  const [h, s, l] = hsl;

  // lighter(t): t=0 keeps the base, t=1 reaches (H, 15%, 97%)
  const lighter = (t: number): string =>
    `hsl(${h}, ${Math.round(s + (15 - s) * t)}%, ${Math.round(l + (97 - l) * t)}%)`;

  // darker(t): t=0 keeps the base, t=1 reaches (H, S, 6%)
  const darker = (t: number): string =>
    `hsl(${h}, ${s}%, ${Math.round(l + (6 - l) * t)}%)`;

  return {
    50:  lighter(0.95),
    100: lighter(0.88),
    200: lighter(0.68),
    300: lighter(0.47),
    400: lighter(0.22),
    500: hex,
    600: darker(0.15),
    700: darker(0.30),
    800: darker(0.52),
    900: darker(0.70),
  };
}

/**
 * Injects --color-{name}-{step} CSS custom properties onto `el`
 * (defaults to :root). Calling this overrides whatever the stylesheet
 * defines for those variables until removeColorScale() is called.
 */
export function applyColorScale(
  name: string,
  hex: string,
  el: HTMLElement = document.documentElement,
): void {
  const scale = generateColorScale(hex);
  Object.entries(scale).forEach(([step, value]) => {
    el.style.setProperty(`--color-${name}-${step}`, value);
  });
}

/**
 * Removes the inline --color-{name}-* properties, falling back to
 * whatever the stylesheet defines.
 */
export function removeColorScale(
  name: string,
  el: HTMLElement = document.documentElement,
): void {
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].forEach((step) => {
    el.style.removeProperty(`--color-${name}-${step}`);
  });
}
