import { useEffect, useRef, useState } from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { Folder, Idea } from '../types/models';
import { FOLDER_COLORS, KIND_META } from '../utils/constants';

interface CreativeFolderCardProps {
  folder: Folder;
  ideas: Idea[];
  onOpen: (folderId: string) => void;
  onEdit: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
}

export function CreativeFolderCard({
  folder,
  ideas,
  onOpen,
  onEdit,
  onDelete,
}: CreativeFolderCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const palette = FOLDER_COLORS[folder.color] ?? FOLDER_COLORS.terracotta;
  const previewIdeas = ideas.slice(0, 3);
  const countLabel = ideas.length === 1 ? '1 idea' : `${ideas.length} ideas`;

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  return (
    <div className="group relative flex flex-col items-center">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(folder.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen(folder.id);
          }
        }}
        className="relative w-full max-w-[210px] cursor-pointer pt-5 focus:outline-none"
        aria-label={`Abrir carpeta ${folder.name} (${countLabel})`}
      >
        {/* Back folder shell with top-left tab */}
        <div className="relative h-[132px] w-full">
          <div
            className="absolute left-0 top-0 h-6 w-[44%] rounded-t-2xl transition-transform duration-200 group-hover:-translate-y-0.5"
            style={{ backgroundColor: palette.back }}
          />
          <div
            className="absolute inset-x-0 top-3 bottom-0 rounded-[22px] shadow-[var(--shadow-card)] transition-transform duration-200 group-hover:-translate-y-0.5"
            style={{ backgroundColor: palette.back }}
          />

          {/* Peeking mini-cards inspired by Reference 1 */}
          <div className="pointer-events-none absolute inset-x-3 top-0 h-[84px]">
            {previewIdeas.length === 0 ? (
              <div className="mx-auto mt-1 h-16 w-[84%] -rotate-2 rounded-xl border border-black/5 bg-[var(--bg-surface)]/95 p-2.5 shadow-sm transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:-rotate-3">
                <div className="h-1.5 w-10 rounded-full bg-[var(--bg-hover)]" />
                <div className="mt-2 h-1.5 w-16 rounded-full bg-[var(--bg-subtle)]" />
                <p className="mt-2 text-[10px] font-medium text-[var(--text-muted)]">
                  Carpeta vacía
                </p>
              </div>
            ) : (
              <>
                {previewIdeas[2] && (
                  <div className="absolute right-1 top-1 h-16 w-[56%] rotate-[7deg] rounded-xl border border-black/6 bg-[var(--bg-surface)] p-2 shadow-sm transition-transform duration-300 group-hover:-translate-y-2 group-hover:rotate-[10deg]">
                    <span className="block text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {KIND_META[previewIdeas[2].kind].shortLabel}
                    </span>
                    <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-tight text-[var(--text-primary)]">
                      {previewIdeas[2].title}
                    </p>
                  </div>
                )}

                {previewIdeas[1] && (
                  <div className="absolute left-1 top-0.5 h-16 w-[58%] -rotate-[7deg] rounded-xl border border-black/6 bg-[var(--bg-surface)] p-2 shadow-sm transition-transform duration-300 group-hover:-translate-y-2 group-hover:-rotate-[10deg]">
                    <span className="block text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {KIND_META[previewIdeas[1].kind].shortLabel}
                    </span>
                    <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-tight text-[var(--text-primary)]">
                      {previewIdeas[1].title}
                    </p>
                  </div>
                )}

                {previewIdeas[0] && (
                  <div className="absolute inset-x-0 top-0 mx-auto h-[70px] w-[70%] rotate-[1deg] overflow-hidden rounded-xl border border-black/8 bg-[var(--bg-surface)] p-2.5 shadow-md transition-transform duration-300 group-hover:-translate-y-2.5 group-hover:rotate-0">
                    {previewIdeas[0].coverImageUrl ? (
                      <img
                        src={previewIdeas[0].coverImageUrl}
                        alt=""
                        className="mb-1 h-7 w-full rounded-md object-cover"
                      />
                    ) : (
                      <div className="mb-1 flex items-center gap-1">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: palette.swatch }}
                        />
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                          {KIND_META[previewIdeas[0].kind].shortLabel}
                        </span>
                      </div>
                    )}
                    <p className="line-clamp-2 text-[10.5px] font-semibold leading-snug text-[var(--text-primary)]">
                      {previewIdeas[0].title}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Front curved pocket */}
          <div
            className="absolute inset-x-0 bottom-0 flex h-[86px] flex-col justify-between rounded-[22px] border-t border-white/30 px-3.5 py-3 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.22)] transition-transform duration-200 group-hover:translate-y-0.5 group-active:scale-[0.98]"
            style={{ background: palette.frontGradient }}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className="rounded-full bg-white/30 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-xs"
                style={{ color: palette.textOnFront }}
              >
                {countLabel}
              </span>

              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((prev) => !prev);
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/8 text-black/75 transition hover:bg-black/15 focus:outline-none"
                  aria-label={`Opciones de ${folder.name}`}
                >
                  <MoreVertical size={14} />
                </button>

                {menuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="animate-fade-in absolute right-0 top-8 z-30 w-40 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5 shadow-[var(--shadow-float)]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(folder);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                    >
                      <Pencil size={13} />
                      Editar carpeta
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(folder);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-[#C96F53] hover:bg-[#C96F53]/10"
                    >
                      <Trash2 size={13} />
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="h-1 w-8 rounded-full bg-white/30" />
          </div>
        </div>
      </div>

      {/* Folder title below */}
      <button
        type="button"
        onClick={() => onOpen(folder.id)}
        className="mt-2.5 max-w-[200px] truncate text-center font-display text-[15px] font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--accent-terracotta)]"
      >
        {folder.name}
      </button>
    </div>
  );
}
