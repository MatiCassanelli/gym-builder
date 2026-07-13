export function formatDateEs(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function initialsOf(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

export function isExpired(endDateIso: string | null | undefined): boolean {
  if (!endDateIso) return false;
  return new Date(`${endDateIso}T23:59:59`) < new Date();
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
