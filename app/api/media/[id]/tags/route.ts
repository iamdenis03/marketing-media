import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 });
  }

  const role = (session.user as any).role as Role;
  if (role !== Role.ADMIN && role !== Role.EDITOR) {
    return NextResponse.json({ error: 'Fără permisiuni pentru modificarea etichetelor.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { tags } = body; // Array of string tag names

    if (!Array.isArray(tags)) {
      return NextResponse.json({ error: 'Format etichete invalid.' }, { status: 400 });
    }

    // Upsert all tag names
    const tagConnects = await Promise.all(
      tags.map(async (name: string) => {
        const cleanName = name.toLowerCase().trim();
        const tag = await prisma.tag.upsert({
          where: { name: cleanName },
          update: {},
          create: { name: cleanName },
        });
        return { id: tag.id };
      })
    );

    // Update MediaAsset tags
    const updatedAsset = await prisma.mediaAsset.update({
      where: { id: params.id },
      data: {
        tags: {
          set: tagConnects,
        },
      },
      include: {
        tags: true,
      },
    });

    return NextResponse.json(updatedAsset);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
