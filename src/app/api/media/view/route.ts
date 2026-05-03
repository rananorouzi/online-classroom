
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { canAccessMediaKey, isValidMediaKey } from '@/lib/media-access';
import { getSignedReadUrl } from '@/lib/s3';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pathname = request.nextUrl.searchParams.get('pathname');
  if (!pathname) {
    return NextResponse.json({ error: 'Missing pathname' }, { status: 400 });
  }

  if (!isValidMediaKey(pathname)) {
    return NextResponse.json({ error: 'Invalid pathname' }, { status: 400 });
  }

  const role = (session.user as { role?: string }).role;
  const hasAccess = await canAccessMediaKey(session.user.id, role, pathname);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let signedUrl: string;
  try {
    signedUrl = await getSignedReadUrl(pathname);
  } catch {
    // Local dev: serve file directly from public/ if it exists
    const isLocalDev = process.env.NODE_ENV !== 'production' && !process.env.VERCEL;
    if (isLocalDev) {
      const { existsSync } = await import('fs');
      const path = await import('path');
      const localPath = path.join(process.cwd(), 'public', pathname);
      if (existsSync(localPath)) {
        const { readFile } = await import('fs/promises');
        const buf = await readFile(localPath);
        const ext = pathname.split('.').pop()?.toLowerCase() ?? '';
        const mime: Record<string, string> = { mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', ogg: 'audio/ogg', pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
        return new NextResponse(buf, { headers: { 'Content-Type': mime[ext] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' } });
      }
    }
    return new NextResponse('Not found', { status: 404 });
  }

  // Fetch the file from the signed URL
  const fileRes = await fetch(signedUrl);
  if (!fileRes.ok || !fileRes.body) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(fileRes.body, {
    headers: {
      'Content-Type': fileRes.headers.get('content-type') ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
