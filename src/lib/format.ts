import type { Trainer, UserRef } from '../types';

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

export function nextDayIso(iso: string): string {
  if (!iso) return '';
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function authorLabel(trainers: Trainer[], author: UserRef): string {
  const trainer = trainers.find((t) => t.id === author.uid);
  if (!trainer) return author.email;
  return `${trainer.name} ${trainer.lastName}`.trim();
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
