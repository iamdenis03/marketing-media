import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 });
  }

  try {
    const seasons = await prisma.season.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        _count: {
          select: { events: true },
        },
      },
    });

    return NextResponse.json(seasons);
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
  if (role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Doar administratorii pot crea sezoane.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, startDate, endDate } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: 'Numele, data de început și data de sfârșit sunt obligatorii.' }, { status: 400 });
    }

    const season = await prisma.season.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    return NextResponse.json(season, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
