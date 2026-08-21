import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { saveFile, generateThumbnail } from '@/lib/storage';
import { MediaType, Role } from '@prisma/client';
import path from 'path';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB limit per file

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 });
  }

  const userRole = (session.user as any).role as Role;
  if (userRole !== Role.ADMIN && userRole !== Role.EDITOR) {
    return NextResponse.json({ error: 'Nu aveți permisiunea de a încărca fișiere (doar Admin/Editor).' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const dayId = formData.get('dayId') as string;
    const rawTags = formData.get('tags') as string; // JSON string array or comma separated
    const files = formData.getAll('files') as File[];

    if (!dayId || !files || files.length === 0) {
      return NextResponse.json({ error: 'Lipsește ziua sau fișierele pentru upload.' }, { status: 400 });
    }

    // Verify Day exists
    const day = await prisma.day.findUnique({
      where: { id: dayId },
      include: { event: true },
    });

    if (!day) {
      return NextResponse.json({ error: 'Ziua specificată nu există.' }, { status: 404 });
    }

    // Process tags
    let tagNames: string[] = [];
    if (rawTags) {
      try {
        tagNames = JSON.parse(rawTags);
      } catch {
        tagNames = rawTags.split(',').map((t) => t.trim()).filter(Boolean);
      }
    }

    // Prepare tags DB connects
    const tagConnects = await Promise.all(
      tagNames.map(async (name) => {
        const cleanName = name.toLowerCase().trim();
        const tag = await prisma.tag.upsert({
          where: { name: cleanName },
          update: {},
          create: { name: cleanName },
        });
        return { id: tag.id };
      })
    );

    const uploadedAssets = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({
          error: `Fișierul "${file.name}" depășește limita maximă admisă de 500MB (${(file.size / 1024 / 1024).toFixed(1)}MB).`,
        }, { status: 400 });
      }

      const mimeType = file.type;
      const isPhoto = mimeType.startsWith('image/') || /\.(jpg|jpeg|png|heic|webp)$/i.test(file.name);
      const isVideo = mimeType.startsWith('video/') || /\.(mp4|mov|mkv|avi|webm)$/i.test(file.name);

      if (!isPhoto && !isVideo) {
        return NextResponse.json({
          error: `Formatul fișierului "${file.name}" nu este suportat (doar imagini și clipuri video).`,
        }, { status: 400 });
      }

      const type: MediaType = isPhoto ? MediaType.PHOTO : MediaType.VIDEO;

      // Unique filename to avoid collisions on disk
      const ext = path.extname(file.name);
      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1e6);
      const fileName = `${timestamp}_${randomSuffix}${ext}`;

      // Disk subPath: {eventId}/{dayId}/{fileName}
      const subPath = path.join(day.eventId, day.id, fileName).replace(/\\/g, '/');

      // Convert File stream/arrayBuffer to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save file on disk
      await saveFile(buffer, subPath);

      // Generate thumbnail if photo
      let thumbnailSubPath: string | null = null;
      if (isPhoto) {
        thumbnailSubPath = await generateThumbnail(buffer, mimeType || 'image/jpeg', subPath);
      }

      // Create Prisma DB Record
      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          dayId: day.id,
          type,
          fileName,
          filePath: subPath,
          thumbnailPath: thumbnailSubPath,
          uploadedById: (session.user as any).id,
          fileSize: file.size,
          originalName: file.name,
          tags: {
            connect: tagConnects,
          },
        },
        include: {
          tags: true,
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      uploadedAssets.push(mediaAsset);
    }

    return NextResponse.json({
      message: `S-au încărcat cu succes ${uploadedAssets.length} fișiere.`,
      assets: uploadedAssets,
    });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message || 'A apărut o eroare la salvarea fișierelor.' }, { status: 500 });
  }
}
