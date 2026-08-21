import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('eventId');

  try {
    const where: any = {};
    if (eventId) where.eventId = eventId;

    const days = await prisma.day.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        event: { select: { id: true, name: true, seasonId: true } },
        _count: { select: { mediaAssets: true } },
      },
    });

    return NextResponse.json(days);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 });
  }

  const role = (session.user as any).role as Role;
  if (role !== Role.ADMIN && role !== Role.EDITOR) {
    return NextResponse.json({ error: 'Fără drepturi de adăugare zi.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { eventId, date, label } = body;

    if (!eventId || !date) {
      return NextResponse.json({ error: 'Evenimentul și data sunt obligatorii.' }, { status: 400 });
    }

    const day = await prisma.day.create({
      data: {
        eventId,
        date: new Date(date),
        label: label || null,
      },
    });

    return NextResponse.json(day, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
