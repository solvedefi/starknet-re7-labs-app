import { getServerPrice } from '@/utils/serverPricer';
import { NextResponse } from 'next/server';

export const revalidate = 300; // 5 mins
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, context: any) {
  try {
    const params = await context.params;
    const tokenName = params.name;

    if (!tokenName) {
      throw new Error('Invalid token');
    }

    const priceInfo = await getServerPrice(tokenName);

    const resp = NextResponse.json({
      price: priceInfo.price,
      timestamp: priceInfo.timestamp,
      name: tokenName,
    });
    resp.headers.set(
      'Cache-Control',
      `s-maxage=${revalidate}, stale-while-revalidate=120`,
    );
    return resp;
  } catch (err) {
    console.error('Error /api/price/:name', err);
    return NextResponse.json({}, { status: 500 });
  }
}
