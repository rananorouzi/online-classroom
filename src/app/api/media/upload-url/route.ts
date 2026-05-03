
import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mkdir, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import path from 'path';

const MAX_UPLOAD_SIZE = 500 * 1024 * 1024; // 500 MB
const ALLOWED_CONTENT_TYPE_PREFIXES = ['audio/', 'video/', 'image/', 'application/pdf'];
const FOLDER_PATTERN = /^(feedback|lessons|submissions)(?:\/[a-zA-Z0-9_-]+)*$/;

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
  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

  let requestedFolder = folder.trim() ? folder.trim() : 'feedback';
  if (!FOLDER_PATTERN.test(requestedFolder)) {
    return NextResponse.json(
      {
        error:
          'Invalid folder. Only feedback/*, lessons/*, or submissions/* paths are allowed.',
      },
      { status: 400 }
    );
  }

  if (role === 'STUDENT') {
    if (requestedFolder === 'submissions') {
      requestedFolder = `submissions/${session.user.id}`;
    }

    const expectedBase = `submissions/${session.user.id}`;
    if (requestedFolder !== expectedBase && !requestedFolder.startsWith(`${expectedBase}/`)) {
      return NextResponse.json(
        { error: 'Students can only upload to their own submissions folder.' },
        { status: 403 }
      );
    }
  }

  if ((role === 'TEACHER' || role === 'ADMIN') && requestedFolder.startsWith('submissions')) {
    return NextResponse.json(
      { error: 'Teachers and admins cannot upload to student submissions folders.' },
      { status: 403 }
    );
  }

  const safeFolder = sanitizePathSegment(requestedFolder);
  const safeFilename = sanitizePathSegment(filename);
  if (!safeFilename) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }
  const key = safeFolder ? `${safeFolder.replace(/\/$/, '')}/${safeFilename}` : safeFilename;

  // Local dev fallback — when no Blob token is configured, store files on disk
  const isLocalDev = !process.env.BLOB_READ_WRITE_TOKEN &&
    process.env.NODE_ENV !== 'production' &&
    !process.env.VERCEL;

  if (isLocalDev) {
    try {
      const keyDir = path.dirname(key);
      const uploadsDir = path.join(process.cwd(), 'public', keyDir === '.' ? '' : keyDir);
      await new Promise<void>((res, rej) =>
        mkdir(uploadsDir, { recursive: true }, (err) => (err ? rej(err) : res()))
      );
      const destPath = path.join(process.cwd(), 'public', key);
      const writeStream = createWriteStream(destPath);
      if (!request.body) throw new Error('Missing body');
      let bytesWritten = 0;
      const nodeStream = Readable.fromWeb(request.body as import('stream/web').ReadableStream<Uint8Array>);
      nodeStream.on('data', (chunk: Buffer) => {
        bytesWritten += chunk.length;
        if (bytesWritten > MAX_UPLOAD_SIZE) {
          nodeStream.destroy(new Error('File too large'));
        }
      });
      await pipeline(nodeStream, writeStream);
      return NextResponse.json({ pathname: key });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg === 'File too large') {
        return NextResponse.json({ error: 'File is too large (max 500MB)' }, { status: 413 });
      }
      console.error('[upload-url] Local write failed:', err);
      return NextResponse.json({ error: 'Local upload failed' }, { status: 500 });
    }
  }

  try {
    const blob = await put(key, request.body, {
      access: 'public',
      contentType,
    });
    // Return only the pathname (key) — callers must go through /api/media/* routes
    // to access the file. Returning the raw public URL would let clients bypass
    // application-level access control.
    return NextResponse.json({ pathname: blob.pathname });
  } catch (err) {
    console.error('[upload-url] Blob put failed:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
