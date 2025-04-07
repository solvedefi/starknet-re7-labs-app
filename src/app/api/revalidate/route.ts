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
  const prom1 = fetch(`${process.env.HOSTNAME}/api/strategies`);
  const prom2 = fetch(`${process.env.HOSTNAME}/api/stats`);

  await Promise.all([prom1, prom2]);
  console.error('Revalidation complete');
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
