/**
 * Image processor — converts uploads to WebP with context-aware resizing.
 *
 * All raster images are converted to WebP. SVG and ICO files pass through
 * unchanged (vector / favicon formats that don't benefit from conversion).
 *
 * Size profiles are matched by slot name. Each profile defines:
 *   maxWidth / maxHeight  — hard upper bounds (canvas won't exceed these)
 *   quality               — WebP encoder quality (0–1)
 *
 * Aspect ratio is always preserved. Images smaller than the profile limits
 * are kept at their original size (never upscaled).
 */

export type ImageSlot =
  | 'logo'           // portal header logo  — wide strip
  | 'logo-compact'   // collapsed sidebar icon — square
  | 'favicon'        // browser favicon — tiny square
  | 'banner'         // hero banner background — full-width landscape
  | 'channel-header' // channel / sub-channel header
  | 'splash-header'  // splash page header
  | 'article-image'  // inline article image block
  | 'gallery-card'   // gallery card thumbnail
  | 'media-library'; // general media upload

interface SizeProfile {
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

const PROFILES: Record<ImageSlot, SizeProfile> = {
  'logo':           { maxWidth: 600,  maxHeight: 200,  quality: 0.90 },
  'logo-compact':   { maxWidth: 200,  maxHeight: 200,  quality: 0.90 },
  'favicon':        { maxWidth: 64,   maxHeight: 64,   quality: 0.85 },
  'banner':         { maxWidth: 1920, maxHeight: 800,  quality: 0.82 },
  'channel-header': { maxWidth: 1600, maxHeight: 600,  quality: 0.82 },
  'splash-header':  { maxWidth: 1600, maxHeight: 640,  quality: 0.82 },
  'article-image':  { maxWidth: 1200, maxHeight: 900,  quality: 0.80 },
  'gallery-card':   { maxWidth: 800,  maxHeight: 600,  quality: 0.80 },
  'media-library':  { maxWidth: 2400, maxHeight: 2400, quality: 0.82 },
};

const PASSTHROUGH_TYPES = new Set(['image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']);
// Favicons must stay as PNG/ICO/SVG — WebP is not supported as a favicon format
const FAVICON_PASSTHROUGH_TYPES = new Set(['image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/png']);

export interface ProcessedImage {
  file: File;
  objectUrl: string;
  originalSize: number;
  processedSize: number;
  width: number;
  height: number;
}

/**
 * Process a file upload for a given slot.
 * Returns a ProcessedImage with a converted WebP File and a ready-to-use objectUrl.
 * Revoke the objectUrl when no longer needed to free memory.
 */
export async function processImage(file: File, slot: ImageSlot): Promise<ProcessedImage> {
  const passthroughs = slot === 'favicon' ? FAVICON_PASSTHROUGH_TYPES : PASSTHROUGH_TYPES;
  if (passthroughs.has(file.type)) {
    const objectUrl = URL.createObjectURL(file);
    return { file, objectUrl, originalSize: file.size, processedSize: file.size, width: 0, height: 0 };
  }

  const profile = PROFILES[slot];
  const bitmap = await createImageBitmap(file);
  const { width: origW, height: origH } = bitmap;

  // Scale down only — never upscale
  const scale = Math.min(1, profile.maxWidth / origW, profile.maxHeight / origH);
  const targetW = Math.round(origW * scale);
  const targetH = Math.round(origH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  const blob = await canvasToWebP(canvas, profile.quality);
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const webpFile = new File([blob], `${baseName}.webp`, { type: 'image/webp' });
  const objectUrl = URL.createObjectURL(webpFile);

  return {
    file: webpFile,
    objectUrl,
    originalSize: file.size,
    processedSize: webpFile.size,
    width: targetW,
    height: targetH,
  };
}

/**
 * Like processImage, but also returns a base64 data URL suitable for localStorage persistence.
 * Use this when the result needs to survive page reloads (blob URLs do not).
 */
export async function processImageToDataUrl(
  file: File,
  slot: ImageSlot,
): Promise<ProcessedImage & { dataUrl: string }> {
  const result = await processImage(file, slot);
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(result.file);
  });
  return { ...result, dataUrl };
}

function canvasToWebP(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob returned null')),
      'image/webp',
      quality,
    );
  });
}
