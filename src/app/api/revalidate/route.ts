import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  console.log('Authorization header:', authHeader);
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('Unauthorized request');
    return new Response('Unauthorized', {
      status: 401,
    });
  }
  revalidatePath('/api/strategies');
  revalidatePath('/api/stats');
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
