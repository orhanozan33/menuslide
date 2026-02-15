/**
 * DigitalOcean Spaces'e slide görseli yükleme ve eski dosyaları temizleme.
 * Versioned path: slides/{screenId}/{versionHash}/slide_X.jpg (immutable, long cache).
 * Legacy path: slides/{screenId}/{templateId}-{index}.jpg (geçiş dönemi).
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
  // Bucket: sadece isim (https:// veya .com içermemeli)
  let bucket = process.env.DO_SPACES_BUCKET?.trim() || 'menuslide-signage';
  bucket = bucket.replace(/^https?:\/\//, '').split('/')[0].split('.')[0];
  // Region: sadece tor1, nyc3 vb. (https veya URL değil)
  let region = process.env.DO_SPACES_REGION?.trim() || 'tor1';
  if (region.startsWith('http') || region.includes('.')) region = 'tor1';
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
  rotationIndex: number,
  buffer: Buffer
): Promise<string> {
  const client = getSpacesClient();
  let bucket = process.env.DO_SPACES_BUCKET?.trim() || 'menuslide-signage';
  bucket = bucket.replace(/^https?:\/\//, '').split('/')[0].split('.')[0];
  if (!client) {
    throw new Error('Spaces not configured: DO_SPACES_KEY and DO_SPACES_SECRET required');
  }
  const key = `slides/${screenId}/${templateId}-${rotationIndex}.jpg`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
      CacheControl: 'public, max-age=0, must-revalidate',
    })
  );
  return key;
}

/** Versioned path: slides/{screenId}/{versionHash}/slide_X.jpg — Cache-Control: immutable. Key overwrite kontrolü. */
export async function uploadSlideVersioned(
  screenId: string,
  versionHash: string,
  index: number,
  buffer: Buffer
): Promise<string> {
  const client = getSpacesClient();
  let bucket = process.env.DO_SPACES_BUCKET?.trim() || 'menuslide-signage';
  bucket = bucket.replace(/^https?:\/\//, '').split('/')[0].split('.')[0];
  if (!client) {
    throw new Error('Spaces not configured: DO_SPACES_KEY and DO_SPACES_SECRET required');
  }
  const key = `slides/${screenId}/${versionHash}/slide_${index}.jpg`;
  if (!/^slides\/[^/]+\/[^/]+\/slide_\d+\.jpg$/.test(key)) {
    throw new Error(`uploadSlideVersioned: key format hatası (slide_0, slide_1, slide_2 olmalı): ${key}`);
  }
  const res = await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
      CacheControl: 'public, max-age=0, must-revalidate',
    })
  );
  console.log('[spaces-slides] uploadSlideVersioned key=%s ETag=%s', key, (res as { ETag?: string }).ETag ?? '');
  return key;
}

/** layout_snapshot.json — Cache-Control: no-cache */
export async function uploadLayoutSnapshotJson(
  screenId: string,
  versionHash: string,
  json: object
): Promise<string> {
  const client = getSpacesClient();
  let bucket = process.env.DO_SPACES_BUCKET?.trim() || 'menuslide-signage';
  bucket = bucket.replace(/^https?:\/\//, '').split('/')[0].split('.')[0];
  if (!client) {
    throw new Error('Spaces not configured');
  }
  const key = `slides/${screenId}/${versionHash}/layout_snapshot.json`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(json),
      ContentType: 'application/json',
      ACL: 'public-read',
      CacheControl: 'no-cache, must-revalidate',
    })
  );
  return key;
}

/** Versioned modelde: slides/{screenId}/ altında versionHash dışındaki tüm anahtarları siler (versioned klasörler + legacy .jpg) */
export async function deleteSlidesExceptVersion(
  screenId: string,
  versionHashToKeep: string
): Promise<number> {
  const client = getSpacesClient();
  let bucket = process.env.DO_SPACES_BUCKET?.trim() || 'menuslide-signage';
  bucket = bucket.replace(/^https?:\/\//, '').split('/')[0].split('.')[0];
  if (!client) return 0;

  const prefix = `slides/${screenId}/`;
  const keepPrefix = `slides/${screenId}/${versionHashToKeep}/`;
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
    const toDelete: { Key: string }[] = [];
    for (const obj of list.Contents ?? []) {
      const key = obj.Key ?? '';
      if (!key || key.startsWith(keepPrefix)) continue;
      toDelete.push({ Key: key });
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

export function isSpacesConfigured(): boolean {
  return !!(process.env.DO_SPACES_KEY?.trim() && process.env.DO_SPACES_SECRET?.trim());
}

/**
 * Ekrandaki yayında olmayan slide görsellerini siler (eski version'lar, rotation'dan çıkanlar).
 * keysToKeep: "templateId-0", "templateId-0-v123" gibi dosya adları (prefix ve .jpg hariç).
 */
export async function deleteSlidesNotInSet(
  screenId: string,
  keysToKeep: string[]
): Promise<number> {
  const client = getSpacesClient();
  let bucket = process.env.DO_SPACES_BUCKET?.trim() || 'menuslide-signage';
  bucket = bucket.replace(/^https?:\/\//, '').split('/')[0].split('.')[0];
  if (!client) return 0;

  const keepSet = new Set(keysToKeep);
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
      if (!keepSet.has(name)) toDelete.push({ Key: key });
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
