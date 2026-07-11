export function getStorageUrl(
  bucketUrl: string | null | undefined,
  filename: string | null | undefined,
): string | null {
  if (!bucketUrl || !filename) {
    return null;
  }

  const cleanBucketUrl = bucketUrl.replace(/\/$/, '');
  const parts = filename.split('/');
  const encodedParts = parts.map((part) => encodeURIComponent(part));
  const safeFilename = encodedParts.join('/');

  return `${cleanBucketUrl}/${safeFilename}`;
}

export function sanitizeStorageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    return urlObj.href;
  } catch {
    console.warn('Invalid URL passed to sanitizeStorageUrl:', url);
    return url;
  }
}
