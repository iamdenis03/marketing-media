import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDiskStorageInfo, getStorageBasePath } from '@/lib/storage';
import { Role } from '@prisma/client';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 });
  }

  const userRole = (session.user as any).role as Role;
  if (userRole !== Role.ADMIN) {
    return NextResponse.json({ error: 'Doar administratorii pot vizualiza detaliile despre stocare.' }, { status: 403 });
  }

  try {
    const diskInfo = await getDiskStorageInfo();
    const basePath = getStorageBasePath();

    return NextResponse.json({
      ...diskInfo,
      storageBasePath: basePath,
    });
  } catch (error: any) {
    console.error('Error fetching disk space stats:', error);
    return NextResponse.json({ error: 'Nu s-au putut prelua statisticile de stocare.' }, { status: 500 });
  }
}
