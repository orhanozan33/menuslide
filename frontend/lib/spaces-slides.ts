/**
 * DigitalOcean Spaces'e slide görseli yükleme ve eski dosyaları temizleme.
 * Env: DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_BUCKET, DO_SPACES_REGION
 */
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

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

/**
 * Ekrandaki yayında olmayan (rotation'da artık kullanılmayan) slide görsellerini siler.
 * Sadece currentTemplateIds içinde olanlar kalır; diğer .jpg dosyaları silinir.
 */
export async function deleteSlidesNotInSet(
  screenId: string,
  currentTemplateIds: Set<string>
): Promise<number> {
  const client = getSpacesClient();
  const bucket = process.env.DO_SPACES_BUCKET?.trim() || 'menuslide-signage';
  if (!client) return 0;

  const prefix = `slides/${screenId}/`;
  let deleted = 0;
  let continuationToken: string | undefined;

  do {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    const contents = list.Contents ?? [];
    const toDelete: { Key: string }[] = [];
    for (const obj of contents) {
      const key = obj.Key ?? '';
      if (!key.endsWith('.jpg')) continue;
      const name = key.slice(prefix.length, -4);
      if (!currentTemplateIds.has(name)) toDelete.push({ Key: key });
    }
    if (toDelete.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: toDelete, Quiet: true },
        })
      );
      deleted += toDelete.length;
    }
    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);

  return deleted;
}
