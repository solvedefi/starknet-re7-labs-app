import { NextResponse } from 'next/server';
import { getMainnetConfig, PricerRedis } from '@strkfarm/sdk';

export const revalidate = 300; // 5 mins
export const dynamic = 'force-dynamic';

// only meant for backend calls
async function initRedis() {
  try {
    console.log('initRedis server');
    // eslint-disable-next-line
    const config = getMainnetConfig();
    const pricer = new PricerRedis(config, []);
    if (!process.env.REDIS_URL) {
      console.warn('REDIS_URL not set');
      return;
    }
    await pricer.initRedis(process.env.REDIS_URL);
    return pricer;
  } catch (e) {
    console.warn('initRedis error', e);
  }
}

export async function GET(req: Request, context: any) {
  try {
    const { params } = context;
    const tokenName = params.name;

    if (!tokenName) {
      throw new Error('Invalid token');
    }

    const redisClient = await initRedis();
    if (!redisClient) {
      throw new Error('Invalid redis');
    }

    const priceInfo = await redisClient.getPrice(tokenName);
    console.log('getPrice redis', priceInfo, tokenName);
    await redisClient.close();
    const resp = NextResponse.json({
      ...priceInfo,
      name: tokenName,
    });
    resp.headers.set(
      'Cache-Control',
      `s-maxage=${revalidate}, stale-while-revalidate=120`,
    );
    return resp;
  } catch (err) {
    console.error('Error /api/price/:name', err);
    return NextResponse.json(
      {},
      {
        status: 500,
      },
    );
  }
}
