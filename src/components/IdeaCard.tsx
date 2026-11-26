import { CheckSquare, FolderInput } from 'lucide-react';
import type { Folder, Idea } from '../types/models';
import {
  FOLDER_COLORS,
  PRIORITY_META,
  STATUS_META,
  formatRelativeDate,
} from '../utils/constants';
import { KindIcon } from './KindIcon';

interface IdeaCardProps {
  idea: Idea;
  folder?: Folder;
  showMoveButton?: boolean;
  onOpen: (ideaId: string) => void;
  onQuickMove?: (idea: Idea) => void;
}

export function IdeaCard({
  idea,
  folder,
  showMoveButton = false,
  onOpen,
  onQuickMove,
}: IdeaCardProps) {
  const doneCount = idea.checklist.filter((c) => c.done).length;
  const totalChecklist = idea.checklist.length;
  const statusMeta = STATUS_META[idea.status];
  const priorityMeta = PRIORITY_META[idea.priority];
  const folderPalette = folder ? FOLDER_COLORS[folder.color] : null;

  return (
    <article
      onClick={() => onOpen(idea.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(idea.id);
        }
      }}
      className="group relative flex cursor-pointer items-start gap-3.5 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-card)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--border-strong)] active:scale-[0.995]"
    >
      <KindIcon kind={idea.kind} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-display text-[15.5px] font-semibold leading-snug text-[var(--text-primary)]">
            {idea.title || 'Idea sin título'}
          </h3>

          {showMoveButton && onQuickMove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickMove(idea);
              }}
              title="Mover a una carpeta"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition hover:bg-[var(--accent-ink)] hover:text-[var(--accent-ink-fg)]"
            >
              <FolderInput size={14} />
            </button>
          )}
        </div>

        {idea.body.trim() && (
          <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
            {idea.body}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusMeta.pillClass}`}
          >
            {statusMeta.label}
          </span>

          {folder && folderPalette && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: folderPalette.chipBg,
                color: folderPalette.chipText,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: folderPalette.swatch }}
              />
              {folder.name}
            </span>
          )}

          {idea.priority === 'high' && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityMeta.pillClass}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${priorityMeta.dotClass}`} />
              Alta
            </span>
          )}

          {totalChecklist > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
              <CheckSquare size={11} />
              {doneCount}/{totalChecklist}
            </span>
          )}

          <span className="ml-auto text-[11.5px] text-[var(--text-muted)]">
            {formatRelativeDate(idea.updatedAt)}
          </span>
        </div>
      </div>
    </article>
  );
}
