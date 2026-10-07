import config from '../../quiztiary.config.mjs';

// Where the panel QR sends participants. The panel is usually opened on localhost, but the QR
// must carry the public address. Strategies are tried in order; null means "use the address
// the panel was opened from". To support another tunnel or host, add a strategy here and name
// it in `publicUrl` in quiztiary.config.mjs.
const STRATEGIES: Record<string, () => Promise<string | null>> = {
  // cloudflared publishes the quick tunnel hostname on its metrics server (port set in scripts/tunnel.sh).
  cloudflare: async () => {
    const res = await fetch(`http://127.0.0.1:${process.env.TUNNEL_METRICS_PORT || 20241}/quicktunnel`, { signal: AbortSignal.timeout(1000) });
    const { hostname } = await res.json();
    return hostname ? `https://${hostname}` : null;
  },
  origin: async () => null,
};

export async function publicUrl(): Promise<string | null> {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL; // a fixed domain, a named tunnel, a deploy
  try {
    return (await STRATEGIES[config.publicUrl]?.()) ?? null;
  } catch {
    return null; // no tunnel running
  }
}
