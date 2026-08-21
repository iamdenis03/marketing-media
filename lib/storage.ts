import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Read storage path from environment or default to local './media-storage'
export function getStorageBasePath(): string {
  const customPath = process.env.MEDIA_STORAGE_PATH;
  if (customPath) {
    return path.isAbsolute(customPath) ? customPath : path.resolve(process.cwd(), customPath);
  }
  return path.resolve(process.cwd(), 'media-storage');
}

/**
 * Resolves a subPath inside the MEDIA_STORAGE_PATH safely
 */
export function getAbsolutePath(subPath: string): string {
  const basePath = getStorageBasePath();
  const fullPath = path.join(basePath, subPath);
  
  // Security check to prevent directory traversal
  if (!fullPath.startsWith(basePath)) {
    throw new Error('Access denied: Invalid file path');
  }
  return fullPath;
}

/**
 * Ensures parent directory exists for a target absolute path
 */
function ensureParentDirExists(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Save file buffer to local disk at {MEDIA_STORAGE_PATH}/{subPath}
 */
export async function saveFile(buffer: Buffer, subPath: string): Promise<string> {
  const absolutePath = getAbsolutePath(subPath);
  ensureParentDirExists(absolutePath);
  await fs.promises.writeFile(absolutePath, buffer);
  return subPath;
}

/**
 * Returns a Readable Stream for a given subPath
 */
export function getFileStream(subPath: string): fs.ReadStream {
  const absolutePath = getAbsolutePath(subPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error('File not found');
  }
  return fs.createReadStream(absolutePath);
}

/**
 * Deletes a file from local disk
 */
export async function deleteFile(subPath: string): Promise<void> {
  try {
    const absolutePath = getAbsolutePath(subPath);
    if (fs.existsSync(absolutePath)) {
      await fs.promises.unlink(absolutePath);
    }
  } catch (error) {
    console.error(`Failed to delete file at ${subPath}:`, error);
  }
}

/**
 * Generates an image thumbnail using sharp and saves it next to original file
 */
export async function generateThumbnail(
  buffer: Buffer,
  mimeType: string,
  subPath: string
): Promise<string | null> {
  if (!mimeType.startsWith('image/')) {
    return null;
  }

  try {
    const parsed = path.parse(subPath);
    const thumbSubPath = path.join(parsed.dir, `thumb_${parsed.name}.webp`);
    const thumbAbsolutePath = getAbsolutePath(thumbSubPath);
    
    ensureParentDirExists(thumbAbsolutePath);

    await sharp(buffer)
      .resize(400, 400, { fit: 'cover' })
      .toFormat('webp', { quality: 80 })
      .toFile(thumbAbsolutePath);

    return thumbSubPath;
  } catch (err) {
    console.error('Failed to generate thumbnail:', err);
    return null;
  }
}

/**
 * Get disk space usage for server dashboard
 */
export async function getDiskStorageInfo(): Promise<{
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  mediaUsedBytes: number;
}> {
  const basePath = getStorageBasePath();
  
  // Create folder if it doesn't exist yet
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }

  let totalBytes = 0;
  let freeBytes = 0;

  try {
    if (typeof fs.promises.statfs === 'function') {
      const stats = await fs.promises.statfs(basePath);
      totalBytes = Number(stats.bsize) * Number(stats.blocks);
      freeBytes = Number(stats.bsize) * Number(stats.bfree);
    } else {
      // Fallback estimate for systems without statfs
      totalBytes = 100 * 1024 * 1024 * 1024; // 100GB mock
      freeBytes = 50 * 1024 * 1024 * 1024;
    }
  } catch {
    totalBytes = 100 * 1024 * 1024 * 1024;
    freeBytes = 50 * 1024 * 1024 * 1024;
  }

  // Calculate size of media storage folder
  const getFolderSize = (dir: string): number => {
    let size = 0;
    try {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const full = path.join(dir, file.name);
        if (file.isDirectory()) {
          size += getFolderSize(full);
        } else if (file.isFile()) {
          const st = fs.statSync(full);
          size += st.size;
        }
      }
    } catch {
      // ignore read errors
    }
    return size;
  };

  const mediaUsedBytes = getFolderSize(basePath);
  const usedBytes = totalBytes > freeBytes ? totalBytes - freeBytes : mediaUsedBytes;

  return {
    totalBytes,
    freeBytes,
    usedBytes,
    mediaUsedBytes,
  };
}
