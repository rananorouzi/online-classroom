
import { type NextRequest, NextResponse } from 'next/server';
import { head } from '@vercel/blob';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pathname = request.nextUrl.searchParams.get('pathname');
  if (!pathname) {
    return NextResponse.json({ error: 'Missing pathname' }, { status: 400 });
  }

  // Get blob metadata (and signed URL)
  let meta;
  try {
    meta = await head(pathname);
  } catch (e) {
    return new NextResponse('Not found', { status: 404 });
  }
  if (!meta?.url) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Fetch the file from the signed URL
  const fileRes = await fetch(meta.url);
  if (!fileRes.ok || !fileRes.body) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(fileRes.body, {
    headers: {
      'Content-Type': meta.contentType,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
