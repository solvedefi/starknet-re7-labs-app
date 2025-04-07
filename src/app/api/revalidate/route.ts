import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  console.log(`secret`, searchParams.get('secret'));
  if (searchParams.get('secret') !== process.env.MY_SECRET_TOKEN) {
    return new Response(`Invalid credentials`, {
      status: 500,
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
