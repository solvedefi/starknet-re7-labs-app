import axios from 'axios';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const provided = authHeader?.replace(/^Bearer\s+/i, '') || '';
  const expected = process.env.CRON_SECRET || '';

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  const isAuthorized =
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer);

  if (!isAuthorized) {
    return new Response('Unauthorized', { status: 401 });
  }

  const prom1 = axios(`${process.env.HOSTNAME}/api/strategies?no_cache=true`);
  const prom2 = axios(`${process.env.HOSTNAME}/api/stats?no_cache=true`);

  await Promise.all([prom1, prom2]);
  return NextResponse.json(
    {
      revalidated: true,
      now: Date.now(),
    },
    {
      status: 200,
    },
  );
}
