import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

// GET /api/admin/users - List all users in vvrobots_media
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    if (!session || role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Fără drepturi de administrator.' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Eroare la preluarea utilizatorilor.' }, { status: 500 });
  }
}

// PATCH /api/admin/users - Update a user's role
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    if (!session || role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Fără drepturi de administrator.' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, newRole } = body;

    if (!userId || !newRole || !Object.values(Role).includes(newRole)) {
      return NextResponse.json({ error: 'Date invalide.' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole as Role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: 'Eroare la modificarea rolului.' }, { status: 500 });
  }
}
