import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 });
  }

  try {
    const structure = await prisma.season.findMany({
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        name: true,
        events: {
          orderBy: { startDate: 'desc' },
          select: {
            id: true,
            name: true,
            days: {
              orderBy: { date: 'asc' },
              select: {
                id: true,
                date: true,
                label: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(structure);
  } catch (error: any) {
    console.error('Error fetching structure:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
