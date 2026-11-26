import { Inbox, X } from 'lucide-react';
import type { Folder, Idea } from '../types/models';
import { FOLDER_COLORS } from '../utils/constants';

interface MoveFolderModalProps {
  idea: Idea | null;
  folders: Folder[];
  onClose: () => void;
  onSelectFolder: (ideaId: string, folderId: string | null) => Promise<void>;
}

export function MoveFolderModal({
  idea,
  folders,
  onClose,
  onSelectFolder,
}: MoveFolderModalProps) {
  if (!idea) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up w-full max-w-sm rounded-t-[28px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 pb-safe shadow-[var(--shadow-float)] sm:rounded-[28px]"
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
              Mover a carpeta
            </h3>
            <p className="line-clamp-1 text-xs text-[var(--text-muted)]">
              {idea.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={async () => {
              await onSelectFolder(idea.id, null);
              onClose();
            }}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
              idea.folderId === null
                ? 'bg-[var(--accent-ink)] text-[var(--accent-ink-fg)]'
                : 'bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Inbox size={16} />
            <span>Inbox (sin carpeta)</span>
          </button>

          {folders.map((folder) => {
            const active = idea.folderId === folder.id;
            const palette = FOLDER_COLORS[folder.color];
            return (
              <button
                key={folder.id}
                type="button"
                onClick={async () => {
                  await onSelectFolder(idea.id, folder.id);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                  active
                    ? 'bg-[var(--accent-ink)] text-[var(--accent-ink-fg)]'
                    : 'bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: palette.swatch }}
                />
                <span className="truncate">{folder.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
