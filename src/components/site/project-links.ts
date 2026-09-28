export function siteLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host === 'pypi.org') return 'PyPI';
    if (host === 'npmjs.com') return 'npm';
    return host;
  } catch {
    return 'Visit';
  }
}

export function hasMedia(project: { imageUrl?: string; videoUrl?: string }): boolean {
  return Boolean(project.imageUrl?.trim() || project.videoUrl?.trim());
}
