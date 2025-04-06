import { getStrategies } from '@/store/strategies.atoms';
import { NextResponse } from 'next/server';

export const revalidate = 1800;
export const dynamic = 'force-dynamic';

export async function GET(_req: Request) {
  const strategies = getStrategies();

  console.log('strategies', strategies.length);

  const values = strategies.map(async (strategy, index) => {
    if (strategy.isLive()) {
      let retry = 0;
      while (retry < 3) {
        try {
          const tvlInfo = await strategy.getTVL();
          console.log('tvlInfo', index, tvlInfo);
          return tvlInfo.usdValue;
        } catch (e) {
          console.log(e);
          if (retry < 3) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            retry++;
          }
        }
      }
    } else {
      return 0;
    }

    throw new Error('Failed to fetch data');
  });

  const result = await Promise.all(values);

  const response = NextResponse.json({
    tvl: result.reduce((a, b) => a + b, 0),
    lastUpdated: new Date().toISOString(),
  });

  response.headers.set(
    'Cache-Control',
    `s-maxage=${revalidate}, stale-while-revalidate=180`,
  );
  return response;
}
