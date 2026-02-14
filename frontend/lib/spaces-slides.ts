/**
 * DigitalOcean Spaces'e slide görseli yükleme.
 * Env: DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_BUCKET, DO_SPACES_REGION
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let s3Client: S3Client | null = null;

function getSpacesClient(): S3Client | null {
  if (s3Client) return s3Client;
  const key = process.env.DO_SPACES_KEY?.trim();
  const secret = process.env.DO_SPACES_SECRET?.trim();
  const bucket = process.env.DO_SPACES_BUCKET?.trim() || 'menuslide-signage';
  const region = process.env.DO_SPACES_REGION?.trim() || 'tor1';
  if (!key || !secret) return null;
  const endpoint = `https://${region}.digitaloceanspaces.com`;
  s3Client = new S3Client({
    region: 'us-east-1',
    endpoint,
    credentials: { accessKeyId: key, secretAccessKey: secret },
    forcePathStyle: false,
  });
  return s3Client;
}

export async function uploadSlideToSpaces(
  screenId: string,
  templateId: string,
  buffer: Buffer
): Promise<string> {
  const client = getSpacesClient();
  const bucket = process.env.DO_SPACES_BUCKET?.trim() || 'menuslide-signage';
  if (!client) {
    throw new Error('Spaces not configured: DO_SPACES_KEY and DO_SPACES_SECRET required');
  }
  const key = `slides/${screenId}/${templateId}.jpg`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
    })
  );
  return key;
}

export function isSpacesConfigured(): boolean {
  return !!(process.env.DO_SPACES_KEY?.trim() && process.env.DO_SPACES_SECRET?.trim());
}
