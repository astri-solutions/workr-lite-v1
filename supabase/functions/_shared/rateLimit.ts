// Minimal Postgres-backed rate limiter for public, unauthenticated Edge
// Function endpoints — there is no session/token to throttle by on these,
// so a caller's IP address is the only identity available. Each call records
// one hit and counts hits for the same key inside the window; old rows for
// that key are swept on the same call so the table never needs its own cron.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function checkRateLimit(
  admin: SupabaseClient,
  rateKey: string,
  maxHits: number,
  windowSeconds: number,
): Promise<{ allowed: boolean }> {
  try {
    const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();
    await admin.from('edge_rate_limit_hits').delete().eq('rate_key', rateKey).lt('created_at', windowStart);
    const { count } = await admin
      .from('edge_rate_limit_hits')
      .select('id', { count: 'exact', head: true })
      .eq('rate_key', rateKey)
      .gte('created_at', windowStart);
    if ((count ?? 0) >= maxHits) return { allowed: false };
    await admin.from('edge_rate_limit_hits').insert({ rate_key: rateKey });
    return { allowed: true };
  } catch {
    // Rate-limit store itself failing must never block a genuine submission
    // — fail open.
    return { allowed: true };
  }
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('cf-connecting-ip')
    ?? 'unknown';
}
