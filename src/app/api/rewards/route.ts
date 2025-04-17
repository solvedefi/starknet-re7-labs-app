import { NextResponse } from 'next/server';
import { getRewardsInfo } from '../lib';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function GET(_request: Request) {
  console.log('GET /api/rewards ');
  const result = await fetch(
    `${process.env.HOSTNAME}/api/strategies?no_cache=true`,
  );
  const stratsRes = await result.json();
  const strategies = stratsRes.strategies;
  const lastUpdated = new Date(stratsRes.lastUpdated);
  const now = new Date();
  if (now.getTime() - lastUpdated.getTime() > 60000000) {
    console.error('Strategies are stale', lastUpdated, now);
    return new Response('Strategies are stale', {
      status: 500,
    });
  }

  const rewardsInfo = await getRewardsInfo(strategies);

  return NextResponse.json(
    {
      lastUpdated: new Date().toISOString(),
      rewards: rewardsInfo,
    },
    {
      status: 200,
    },
  );
}
