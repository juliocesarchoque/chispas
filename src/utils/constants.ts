import type {
  FolderColor,
  IdeaKind,
  IdeaPriority,
  IdeaStatus,
} from '../types/models';

export const FOLDER_COLORS: Record<
  FolderColor,
  {
    label: string;
    swatch: string;
    back: string;
    frontGradient: string;
    textOnFront: string;
    chipBg: string;
    chipText: string;
  }
> = {
  terracotta: {
    label: 'Terracota',
    swatch: '#C96F53',
    back: '#AD573D',
    frontGradient: 'linear-gradient(155deg, #DB8569 0%, #C5684B 100%)',
    textOnFront: '#2A120A',
    chipBg: 'rgba(201, 111, 83, 0.14)',
    chipText: '#B4573B',
  },
  sage: {
    label: 'Salvia',
    swatch: '#7A9184',
    back: '#5F776A',
    frontGradient: 'linear-gradient(155deg, #98AFA2 0%, #728B7D 100%)',
    textOnFront: '#132018',
    chipBg: 'rgba(122, 145, 132, 0.16)',
    chipText: '#557061',
  },
  sky: {
    label: 'Cielo',
    swatch: '#5DA6D8',
    back: '#4489B9',
    frontGradient: 'linear-gradient(155deg, #7CC0EC 0%, #529BD0 100%)',
    textOnFront: '#0F2536',
    chipBg: 'rgba(93, 166, 216, 0.15)',
    chipText: '#3A7FAE',
  },
  lavender: {
    label: 'Lavanda',
    swatch: '#9D84D4',
    back: '#7E65B8',
    frontGradient: 'linear-gradient(155deg, #B9A3E8 0%, #9277CE 100%)',
    textOnFront: '#20153A',
    chipBg: 'rgba(157, 132, 212, 0.16)',
    chipText: '#7256B0',
  },
  amber: {
    label: 'Ámbar',
    swatch: '#D49A48',
    back: '#B47E31',
    frontGradient: 'linear-gradient(155deg, #E8B76A 0%, #CC8F3D 100%)',
    textOnFront: '#2E1E08',
    chipBg: 'rgba(212, 154, 72, 0.16)',
    chipText: '#A87122',
  },
  stone: {
    label: 'Piedra',
    swatch: '#8F8B83',
    back: '#716D66',
    frontGradient: 'linear-gradient(155deg, #ACA89F 0%, #86827A 100%)',
    textOnFront: '#1E1D1A',
    chipBg: 'rgba(143, 139, 131, 0.16)',
    chipText: '#625E57',
  },
};

export const KIND_META: Record<
  IdeaKind,
  {
    label: string;
    shortLabel: string;
    bgClass: string;
    textClass: string;
  }
> = {
  idea: {
    label: 'Idea',
    shortLabel: 'Idea',
    bgClass: 'bg-amber-500/14 dark:bg-amber-400/15',
    textClass: 'text-amber-700 dark:text-amber-300',
  },
  feature: {
    label: 'Feature',
    shortLabel: 'Feature',
    bgClass: 'bg-[#7A9184]/18 dark:bg-[#8EA899]/20',
    textClass: 'text-[#4E695A] dark:text-[#A9C2B3]',
  },
  ux: {
    label: 'Mejora UX',
    shortLabel: 'UX',
    bgClass: 'bg-violet-500/14 dark:bg-violet-400/15',
    textClass: 'text-violet-700 dark:text-violet-300',
  },
  bug: {
    label: 'Problema',
    shortLabel: 'Bug',
    bgClass: 'bg-[#C96F53]/16 dark:bg-[#D98368]/18',
    textClass: 'text-[#B15337] dark:text-[#EE9F86]',
  },
};

export const STATUS_META: Record<
  IdeaStatus,
  {
    label: string;
    pillClass: string;
  }
> = {
  inbox: {
    label: 'Inbox',
    pillClass:
      'bg-[#C96F53]/15 text-[#B15337] dark:bg-[#D98368]/18 dark:text-[#EE9F86]',
  },
  shaping: {
    label: 'Madurando',
    pillClass:
      'bg-amber-500/14 text-amber-800 dark:bg-amber-400/16 dark:text-amber-300',
  },
  ready: {
    label: 'Lista',
    pillClass:
      'bg-[#7A9184]/20 text-[#455E50] dark:bg-[#8EA899]/20 dark:text-[#B1C8BA]',
  },
  done: {
    label: 'Hecha',
    pillClass:
      'bg-emerald-500/14 text-emerald-700 dark:bg-emerald-400/16 dark:text-emerald-300',
  },
  archived: {
    label: 'Archivada',
    pillClass:
      'bg-[var(--bg-subtle)] text-[var(--text-muted)]',
  },
};

export const PRIORITY_META: Record<
  IdeaPriority,
  {
    label: string;
    dotClass: string;
    pillClass: string;
  }
> = {
  low: {
    label: 'Baja',
    dotClass: 'bg-stone-400',
    pillClass: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]',
  },
  medium: {
    label: 'Media',
    dotClass: 'bg-amber-500',
    pillClass: 'bg-amber-500/14 text-amber-800 dark:text-amber-300',
  },
  high: {
    label: 'Alta',
    dotClass: 'bg-[#C96F53]',
    pillClass: 'bg-[#C96F53]/16 text-[#B15337] dark:text-[#EE9F86]',
  },
};

export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000
  );

  const timeStr = date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (diffDays === 0) return `Hoy, ${timeStr}`;
  if (diffDays === 1) return `Ayer, ${timeStr}`;

  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour >= 12 && hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}
