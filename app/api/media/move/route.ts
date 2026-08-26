import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 });
  }

  const role = (session.user as any).role as Role;
  if (role !== Role.ADMIN && role !== Role.EDITOR) {
    return NextResponse.json({ error: 'Fără drepturi de mutare fișiere.' }, { status: 403 });
  }

  try {
    const { assetIds, targetDayId } = await req.json();

    if (!Array.isArray(assetIds) || assetIds.length === 0 || !targetDayId) {
      return NextResponse.json(
        { error: 'Parametri invalizi pentru mutarea fișierelor.' },
        { status: 400 }
      );
    }

    // Verify target day exists
    const targetDay = await prisma.day.findUnique({
      where: { id: targetDayId },
    });

    if (!targetDay) {
      return NextResponse.json({ error: 'Ziua destinație nu există.' }, { status: 404 });
    }

    // Update dayId for all selected media assets
    const result = await prisma.mediaAsset.updateMany({
      where: {
        id: { in: assetIds },
      },
      data: {
        dayId: targetDayId,
      },
    });

    return NextResponse.json({
      message: `S-au mutat cu succes ${result.count} fișiere media.`,
      count: result.count,
    });
  } catch (error: any) {
    console.error('Error moving media assets:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
