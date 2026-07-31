import sharp from 'sharp';

export type CoverNavTone = 'light' | 'dark';

const LIGHT_THRESHOLD = 0.58;

function averageLuminance(rgb: Buffer, channels: number): number {
  const pixelCount = rgb.length / channels;
  if (pixelCount === 0) return 0;

  let sum = 0;
  for (let i = 0; i < rgb.length; i += channels) {
    const r = rgb[i] ?? 0;
    const g = rgb[i + 1] ?? 0;
    const b = rgb[i + 2] ?? 0;
    sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  return sum / pixelCount / 255;
}

/**
 * Samples the top band of a cover image URL and returns nav ink tone.
 * Used when events are created/updated and when backfilling legacy rows.
 */
import { assertTrustedMediaUrl } from '../utils/media-security.js';

export async function analyzeCoverNavTone(imageUrl: string): Promise<CoverNavTone> {
  // SSRF guard: must run, and be awaited, before any server-side fetch of a
  // client/DB-supplied URL. Rejects non-allowlisted hosts and private IPs
  // (including DNS-rebinding where the hostname resolves to an internal address).
  await assertTrustedMediaUrl(imageUrl);

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Could not fetch cover image (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width ?? 64;
  const height = metadata.height ?? 64;
  const cropHeight = Math.max(1, Math.round(height * 0.22));

  const { data, info } = await sharp(buffer)
    .extract({ left: 0, top: 0, width, height: cropHeight })
    .resize(48, 12, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const luminance = averageLuminance(data, info.channels);
  return luminance >= LIGHT_THRESHOLD ? 'light' : 'dark';
}
