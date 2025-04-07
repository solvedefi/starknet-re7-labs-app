import axios from 'axios';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  console.error('Authorization header:', authHeader);
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('Unauthorized request');
    return new Response('Unauthorized', {
      status: 401,
    });
  }
  console.error('Revalidating...', `${process.env.HOSTNAME}/api/strategies`);
  const prom1 = axios(`${process.env.HOSTNAME}/api/strategies?no_cache=true`);
  const prom2 = axios(`${process.env.HOSTNAME}/api/stats?no_cache=true`);

  const result = await Promise.all([prom1, prom2]);
  console.error('Revalidation complete');
  const res1 = await result[0].data;
  const res2 = await result[1].data;
  console.error(`Value 1: ${res1.lastUpdated}`);
  console.error(`Value 2: ${res2.lastUpdated}`);
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
