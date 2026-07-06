import { api } from '@/lib/api-client';
import { getToken } from '@/lib/auth';

/** Upload a File/Blob to the images bucket and return its hosted URL. */
export async function uploadImageFile(file: File): Promise<string> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  const { url } = await api<{ url: string }>('/api/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    skipContentType: true,
  });
  return url;
}

/** Convert a data: URI into a File suitable for uploadImageFile. */
export function dataUriToFile(dataUri: string, filename: string): File {
  const [meta, b64] = dataUri.split(',');
  const mime = meta.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}
