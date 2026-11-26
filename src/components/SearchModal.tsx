import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Folder, Idea } from '../types/models';
import { formatRelativeDate } from '../utils/constants';
import { KindIcon } from './KindIcon';

interface SearchModalProps {
  open: boolean;
  ideas: Idea[];
  folders: Folder[];
  onClose: () => void;
  onSelectIdea: (ideaId: string) => void;
}

export function SearchModal({
  open,
  ideas,
  folders,
  onClose,
  onSelectIdea,
}: SearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const folderMap = useMemo(
    () => new Map(folders.map((f) => [f.id, f.name])),
    [folders]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ideas.slice(0, 8);
    return ideas.filter((idea) => {
      const haystack = [
        idea.title,
        idea.body,
        idea.notes,
        ...idea.tags,
        idea.folderId ? folderMap.get(idea.folderId) ?? '' : 'inbox',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [ideas, query, folderMap]);

  if (!open) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-4 pt-12 backdrop-blur-[2px] sm:pt-20"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up w-full max-w-lg overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-float)]"
      >
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3.5">
          <Search size={18} className="text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ideas, features, etiquetas..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar búsqueda"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            <X size={15} />
          </button>
        </div>

        <div className="max-h-[60dvh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--text-muted)]">
              No hay ideas que coincidan con “{query}”.
            </p>
          ) : (
            results.map((idea) => (
              <button
                key={idea.id}
                type="button"
                onClick={() => {
                  onSelectIdea(idea.id);
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-[var(--bg-canvas)]"
              >
                <KindIcon kind={idea.kind} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {idea.title || 'Idea sin título'}
                  </p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {idea.folderId ? folderMap.get(idea.folderId) ?? 'Carpeta' : 'Inbox'} ·{' '}
                    {formatRelativeDate(idea.updatedAt)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
