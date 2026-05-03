
import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const MAX_UPLOAD_SIZE = 500 * 1024 * 1024; // 500 MB
const ALLOWED_CONTENT_TYPE_PREFIXES = ['audio/', 'video/', 'image/', 'application/pdf'];

function sanitizePathSegment(s: string): string {
  const normalized = s.normalize('NFKD');
  let out = normalized.replace(/(^\/+|\.\.\/|\\)/g, '');
  out = out.replace(/[^a-zA-Z0-9._\-\/]/g, '-');
  out = out.replace(/-+/g, '-');
  return out.replace(/^\/+|\/+$/g, '');
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const filename = request.nextUrl.searchParams.get('filename');
  const folder = request.nextUrl.searchParams.get('folder') ?? '';

  if (!filename) {
    return NextResponse.json({ error: 'Missing filename' }, { status: 400 });
  }
  if (!request.body) {
    return NextResponse.json({ error: 'Missing request body' }, { status: 400 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!ALLOWED_CONTENT_TYPE_PREFIXES.some((p) => contentType.startsWith(p))) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 });
  }

  const safeFolder = sanitizePathSegment(folder);
  const safeFilename = sanitizePathSegment(filename);
  const key = safeFolder ? `${safeFolder.replace(/\/$/, '')}/${safeFilename}` : safeFilename;

  const blob = await put(key, request.body, {
    access: 'public',
    contentType,
  });
  return NextResponse.json(blob);
}
