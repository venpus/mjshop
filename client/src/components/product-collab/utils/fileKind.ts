const VIDEO_EXTS = new Set([
  'mp4',
  'webm',
  'mov',
  'm4v',
  'avi',
  'mkv',
  '3gp',
]);

function getExtFromName(name: string): string | null {
  const last = name.split('?')[0]?.split('#')[0] ?? name;
  const parts = last.split('.');
  if (parts.length < 2) return null;
  const ext = parts[parts.length - 1]?.trim().toLowerCase();
  return ext ? ext : null;
}

export function isVideoByName(name: string | null | undefined): boolean {
  if (!name) return false;
  const ext = getExtFromName(name);
  return ext != null && VIDEO_EXTS.has(ext);
}

