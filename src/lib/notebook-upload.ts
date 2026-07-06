import { parseNotebook, notebookTitle } from '@/lib/notebook-parse';
import { uploadImageFile, dataUriToFile } from '@/lib/upload-image';
import { api } from '@/lib/api-client';
import { getToken } from '@/lib/auth';

/**
 * Turn an uploaded .ipynb into a notebook blog post: parse it, upload its output
 * images to R2 (so no base64 bloats the DB), and create a `format: 'notebook'`
 * post. Returns the new post's slug.
 */
export async function createNotebookPost(
  file: File,
  onProgress?: (message: string) => void,
): Promise<string> {
  const text = await file.text();
  const { notebook, images } = parseNotebook(text);

  if (images.length) {
    onProgress?.(`Uploading ${images.length} image${images.length > 1 ? 's' : ''}...`);
    const urlByPlaceholder = new Map<string, string>();
    for (const img of images) {
      const url = await uploadImageFile(dataUriToFile(img.dataUri, `${img.placeholder}.${img.ext}`));
      urlByPlaceholder.set(img.placeholder, url);
    }
    for (const cell of notebook.cells) {
      if (cell.kind !== 'code') continue;
      for (const out of cell.outputs) {
        if (out.kind === 'image') out.url = urlByPlaceholder.get(out.url) ?? out.url;
      }
    }
  }

  const title = notebookTitle(notebook) || file.name.replace(/\.ipynb$/i, '').replace(/[-_]+/g, ' ').trim();
  const token = getToken();
  const created = await api<{ slug: string }>('/api/posts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title,
      content: JSON.stringify(notebook),
      author: 'Ashish Kumar Singh',
      format: 'notebook',
    }),
  });
  return created.slug;
}
