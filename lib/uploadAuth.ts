import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { authOptions } from '@/lib/auth';

/** Returns the uploader's user id, or a ready-made error response. */
export async function requireUploader(): Promise<{ userId: string } | { error: NextResponse }> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { error: NextResponse.json({ error: 'Sesiunea a expirat. Autentifică-te din nou.' }, { status: 401 }) };
  }
  const role = (session.user as any).role as Role;
  if (role !== Role.ADMIN && role !== Role.EDITOR) {
    return { error: NextResponse.json({ error: 'Doar Admin/Editor pot încărca fișiere.' }, { status: 403 }) };
  }
  return { userId: (session.user as any).id as string };
}
