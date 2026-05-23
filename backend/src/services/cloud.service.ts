import prisma from '../config/database.js';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL, getR2ConfigDiagnostic } from '../config/cloudflare-r2.js';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_') || 'file';
}

export const cloudService = {
  async list(userId: string, folder?: string, page = 1, limit = 50) {
    const where: { user_id: string; folder?: string } = { user_id: userId };
    if (folder != null && folder !== '') where.folder = folder;
    const [items, total] = await Promise.all([
      prisma.userCloudFile.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.userCloudFile.count({ where }),
    ]);
    return { items, total, page, limit };
  },

  async upload(userId: string, file: { buffer: Buffer; originalname: string; mimetype: string; size: number }, folder = '') {
    if (!r2Client || !R2_PUBLIC_URL) {
      const why = getR2ConfigDiagnostic();
      throw new Error('R2 non configuré: ' + (why.length ? why.join(', ') : 'R2_PUBLIC_URL'));
    }
    const fileId = crypto.randomUUID();
    const base = safeName(file.originalname);
    const key = `cloud/${userId}/${fileId}_${base}`;
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || 'application/octet-stream',
        CacheControl: 'private, max-age=86400',
      })
    );
    const encoded = encodeURIComponent(key.split('/').pop()!);
    const url = `${R2_PUBLIC_URL}/${key}`;
    const record = await prisma.userCloudFile.create({
      data: {
        user_id: userId,
        name: file.originalname,
        key,
        url,
        size_bytes: file.size,
        mime_type: file.mimetype,
        folder: folder || '',
      },
    });
    return record;
  },

  async delete(userId: string, fileId: string) {
    const file = await prisma.userCloudFile.findFirst({ where: { id: fileId, user_id: userId } });
    if (!file) throw new Error('File not found');
    if (r2Client) {
      await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: file.key }));
    }
    await prisma.userCloudFile.delete({ where: { id: fileId } });
    return { success: true };
  },
};
