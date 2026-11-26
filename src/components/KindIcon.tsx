import { Bug, Lightbulb, Sparkles, Wand2 } from 'lucide-react';
import type { IdeaKind } from '../types/models';
import { KIND_META } from '../utils/constants';

interface KindIconProps {
  kind: IdeaKind;
  size?: 'sm' | 'md';
}

export function KindIcon({ kind, size = 'md' }: KindIconProps) {
  const meta = KIND_META[kind];
  const boxSize = size === 'sm' ? 'h-7 w-7 rounded-xl' : 'h-10 w-10 rounded-2xl';
  const iconSize = size === 'sm' ? 14 : 18;

  const Icon =
    kind === 'feature'
      ? Sparkles
      : kind === 'ux'
        ? Wand2
        : kind === 'bug'
          ? Bug
          : Lightbulb;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${boxSize} ${meta.bgClass} ${meta.textClass}`}
      aria-hidden="true"
    >
      <Icon size={iconSize} strokeWidth={2} />
    </span>
  );
}
