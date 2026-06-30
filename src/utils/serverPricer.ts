import { getMainnetConfig, Global, PricerFromApi } from '@strkfarm/sdk';

// Server-only. Prices tokens directly via the strkfarm pricer so server-side
// callers (e.g. /api/stats, /api/price) don't HTTP-hop through
// `${getEndpoint()}/api/price`, which depends on HOSTNAME being a correct
// absolute URL and otherwise falls back to a foreign app (app.troves.fi) that
// returns a stub payload.

let pricer: PricerFromApi | null = null;

function getPricer() {
  if (!pricer) {
    const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
    const config = getMainnetConfig(rpcUrl, 'latest');
    pricer = new PricerFromApi(config, Global.getDefaultTokens());
  }
  return pricer;
}

export async function getServerPrice(
  symbol: string,
): Promise<{ price: number; timestamp: Date }> {
  return getPricer().getPrice(symbol);
}
