import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Hash,
  Inbox,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { moveIdeaToFolder, newId, softDeleteIdea, updateIdea } from '../db/dexie';
import type {
  ChecklistItem,
  Folder,
  Idea,
  IdeaKind,
  IdeaPriority,
  IdeaStatus,
} from '../types/models';
import {
  FOLDER_COLORS,
  KIND_META,
  PRIORITY_META,
  STATUS_META,
  formatRelativeDate,
} from '../utils/constants';
import { copyToClipboard, formatIdeaAsPrompt } from '../utils/formatPrompt';

interface IdeaDetailViewProps {
  idea: Idea;
  folders: Folder[];
  onBack: () => void;
  onToast: (msg: string) => void;
}

const KINDS: IdeaKind[] = ['idea', 'feature', 'ux', 'bug'];
const STATUSES: IdeaStatus[] = ['inbox', 'shaping', 'ready', 'done', 'archived'];
const PRIORITIES: IdeaPriority[] = ['low', 'medium', 'high'];

function mergeBodyAndNotes(body: string, notes: string): string {
  const b = body.trim();
  const n = notes.trim();
  if (b && n) return `${b}\n\n${n}`;
  return b || n;
}

export function IdeaDetailView({
  idea,
  folders,
  onBack,
  onToast,
}: IdeaDetailViewProps) {
  const [title, setTitle] = useState(idea.title);
  const [body, setBody] = useState(() =>
    idea.notes.trim() ? mergeBodyAndNotes(idea.body, idea.notes) : idea.body
  );
  const [newTask, setNewTask] = useState('');
  const [newTag, setNewTag] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [propsOpen, setPropsOpen] = useState(false);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const propsRef = useRef<HTMLDivElement>(null);
  const folderMenuRef = useRef<HTMLDivElement>(null);

  // Sync local draft when switching ideas or receiving remote updates
  useEffect(() => {
    setTitle(idea.title);
    setBody(
      idea.notes.trim() ? mergeBodyAndNotes(idea.body, idea.notes) : idea.body
    );
    setConfirmDelete(false);
    setPropsOpen(false);
    setFolderMenuOpen(false);
  }, [idea.id, idea.updatedAt, idea.title, idea.body, idea.notes]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.style.height = 'auto';
      bodyRef.current.style.height = `${bodyRef.current.scrollHeight}px`;
    }
  }, [body]);

  // Close popovers on outside click or Escape
  useEffect(() => {
    if (!propsOpen && !folderMenuOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (propsOpen && propsRef.current && !propsRef.current.contains(target)) {
        setPropsOpen(false);
      }
      if (
        folderMenuOpen &&
        folderMenuRef.current &&
        !folderMenuRef.current.contains(target)
      ) {
        setFolderMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPropsOpen(false);
        setFolderMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [propsOpen, folderMenuOpen]);

  const currentFolder = folders.find((f) => f.id === idea.folderId) ?? null;
  const currentPalette = currentFolder
    ? FOLDER_COLORS[currentFolder.color]
    : null;

  const handleCopyPrompt = async () => {
    const promptText = formatIdeaAsPrompt(
      { ...idea, title, body, notes: '' },
      currentFolder?.name
    );
    const ok = await copyToClipboard(promptText);
    if (ok) {
      setCopied(true);
      onToast('Copiado como resumen listo para IA');
      setTimeout(() => setCopied(false), 1800);
    } else {
      onToast('No se pudo acceder al portapapeles');
    }
  };

  const handleSelectFolder = async (folderId: string | null) => {
    setFolderMenuOpen(false);
    await moveIdeaToFolder(idea.id, folderId);
  };

  const handleToggleChecklist = async (itemId: string) => {
    const next: ChecklistItem[] = idea.checklist.map((c) =>
      c.id === itemId ? { ...c, done: !c.done } : c
    );
    await updateIdea(idea.id, { checklist: next });
  };

  const handleAddChecklist = async () => {
    const text = newTask.trim();
    if (!text) return;
    const next: ChecklistItem[] = [
      ...idea.checklist,
      { id: newId(), text, done: false },
    ];
    setNewTask('');
    await updateIdea(idea.id, { checklist: next });
  };

  const handleRemoveChecklist = async (itemId: string) => {
    const next = idea.checklist.filter((c) => c.id !== itemId);
    await updateIdea(idea.id, { checklist: next });
  };

  const handleAddTag = async () => {
    const clean = newTag.trim().replace(/^#/, '').toLowerCase();
    if (!clean) return;
    if (!idea.tags.includes(clean)) {
      await updateIdea(idea.id, { tags: [...idea.tags, clean] });
    }
    setNewTag('');
  };

  const handleRemoveTag = async (tag: string) => {
    await updateIdea(idea.id, {
      tags: idea.tags.filter((t) => t !== tag),
    });
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await softDeleteIdea(idea.id);
    onToast('Idea eliminada');
    onBack();
  };

  return (
    <div className="animate-fade-in mx-auto max-w-2xl pb-28 lg:pb-12">
      {/* Top circular bar inspired by Reference 2 + Reference 3 */}
      <div className="sticky top-0 z-30 -mx-4 mb-5 flex items-center justify-between gap-2 bg-[var(--bg-canvas)]/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs transition hover:bg-[var(--bg-subtle)]"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopyPrompt()}
            title="Copiar para IA"
            aria-label="Copiar para IA"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full shadow-xs transition ${
              copied
                ? 'bg-[#7A9184] text-white'
                : 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>

          {/* Properties popover trigger */}
          <div ref={propsRef} className="relative">
            <button
              type="button"
              onClick={() => setPropsOpen((prev) => !prev)}
              title="Propiedades"
              aria-label="Propiedades"
              aria-expanded={propsOpen}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-xs transition ${
                propsOpen
                  ? 'border-[var(--accent-ink)] bg-[var(--accent-ink)] text-[var(--accent-ink-fg)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <SlidersHorizontal size={16} />
            </button>

            {propsOpen && (
              <div className="animate-fade-in absolute right-0 top-12 z-40 w-72 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-float)]">
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Tipo
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {KINDS.map((k) => {
                        const active = idea.kind === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => void updateIdea(idea.id, { kind: k })}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                              active
                                ? 'bg-[var(--accent-ink)] text-[var(--accent-ink-fg)]'
                                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                            }`}
                          >
                            {KIND_META[k].label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Estado
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUSES.map((s) => {
                        const active = idea.status === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() =>
                              void updateIdea(idea.id, { status: s })
                            }
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                              active
                                ? 'bg-[var(--accent-ink)] text-[var(--accent-ink-fg)]'
                                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                            }`}
                          >
                            {STATUS_META[s].label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Prioridad
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRIORITIES.map((p) => {
                        const active = idea.priority === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() =>
                              void updateIdea(idea.id, { priority: p })
                            }
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                              active
                                ? 'bg-[var(--accent-ink)] text-[var(--accent-ink-fg)]'
                                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${PRIORITY_META[p].dotClass}`}
                            />
                            {PRIORITY_META[p].label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-[var(--border-subtle)] pt-3">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Etiquetas
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {idea.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
                        >
                          <Hash size={11} className="text-[var(--text-muted)]" />
                          {tag}
                          <button
                            type="button"
                            onClick={() => void handleRemoveTag(tag)}
                            aria-label={`Quitar etiqueta ${tag}`}
                            className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--bg-hover)]"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}

                      <input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            void handleAddTag();
                          }
                        }}
                        placeholder="+ etiqueta"
                        className="w-28 rounded-full bg-[var(--bg-canvas)] px-2.5 py-1 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleDelete()}
            onBlur={() => setConfirmDelete(false)}
            aria-label={confirmDelete ? 'Confirmar eliminación' : 'Eliminar idea'}
            title={confirmDelete ? 'Toca otra vez para confirmar' : 'Eliminar idea'}
            className={`inline-flex h-10 items-center justify-center rounded-full transition ${
              confirmDelete
                ? 'gap-1.5 bg-[#C96F53] px-3.5 text-xs font-semibold text-white'
                : 'w-10 border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-xs hover:bg-[#C96F53]/12 hover:text-[#C96F53]'
            }`}
          >
            <Trash2 size={16} />
            {confirmDelete && <span>Confirmar</span>}
          </button>
        </div>
      </div>

      {/* Main clean paper surface */}
      <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)] sm:p-8">
        {/* Single clean folder pill with 1-tap popover */}
        <div ref={folderMenuRef} className="relative inline-block">
          <button
            type="button"
            onClick={() => setFolderMenuOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-subtle)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] transition hover:opacity-85"
            style={
              currentPalette
                ? {
                    backgroundColor: currentPalette.chipBg,
                    color: currentPalette.chipText,
                  }
                : undefined
            }
          >
            {currentPalette ? (
              <>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: currentPalette.swatch }}
                />
                <span>{currentFolder?.name}</span>
              </>
            ) : (
              <>
                <Inbox size={12} />
                <span>Inbox</span>
              </>
            )}
          </button>

          {folderMenuOpen && (
            <div className="animate-fade-in absolute left-0 top-9 z-30 w-56 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5 shadow-[var(--shadow-float)]">
              <button
                type="button"
                onClick={() => void handleSelectFolder(null)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                  idea.folderId === null
                    ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-canvas)]'
                }`}
              >
                <Inbox size={13} />
                <span>Inbox</span>
              </button>

              {folders.map((folder) => {
                const active = idea.folderId === folder.id;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => void handleSelectFolder(folder.id)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                      active
                        ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-canvas)]'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: FOLDER_COLORS[folder.color].swatch,
                      }}
                    />
                    <span className="truncate">{folder.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Editable title immediately below */}
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            void updateIdea(idea.id, { title: e.target.value });
          }}
          placeholder="Título de la idea o feature..."
          className="mt-3 w-full bg-transparent font-display text-2xl font-bold leading-tight text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none sm:text-[26px]"
        />

        {/* Single quiet metadata line */}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>{formatRelativeDate(idea.updatedAt)}</span>
          {idea.status !== 'inbox' && (
            <>
              <span>·</span>
              <span>{STATUS_META[idea.status].label}</span>
            </>
          )}
          {idea.priority === 'high' && (
            <>
              <span>·</span>
              <span className="text-[var(--accent-terracotta)]">
                Prioridad Alta
              </span>
            </>
          )}
        </div>

        {/* Single clean description area */}
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            void updateIdea(idea.id, { body: e.target.value, notes: '' });
          }}
          rows={3}
          placeholder="Escribe tu idea, detalles o links de referencia..."
          className="mt-4 w-full resize-none bg-transparent text-[15px] leading-relaxed text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] focus:outline-none"
        />

        {/* Interactive Checklist (inspired by Reference 2) */}
        <div className="mt-6 border-t border-[var(--border-subtle)] pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">
              Pasos / Checklist
            </h3>
            {idea.checklist.length > 0 && (
              <span className="text-xs font-medium text-[var(--text-muted)]">
                {idea.checklist.filter((c) => c.done).length} de{' '}
                {idea.checklist.length}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {idea.checklist.map((item) => (
              <div
                key={item.id}
                className="group flex items-center gap-3 rounded-xl px-1.5 py-1 transition hover:bg-[var(--bg-canvas)]"
              >
                <button
                  type="button"
                  onClick={() => void handleToggleChecklist(item.id)}
                  aria-label={item.done ? 'Desmarcar paso' : 'Completar paso'}
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    item.done
                      ? 'border-[#7A9184] bg-[#7A9184] text-white'
                      : 'border-[var(--border-strong)] bg-transparent hover:border-[var(--accent-sage)]'
                  }`}
                >
                  {item.done && <Check size={13} strokeWidth={2.8} />}
                </button>

                <span
                  className={`flex-1 text-sm ${
                    item.done
                      ? 'text-[var(--text-muted)] line-through'
                      : 'text-[var(--text-primary)]'
                  }`}
                >
                  {item.text}
                </span>

                <button
                  type="button"
                  onClick={() => void handleRemoveChecklist(item.id)}
                  aria-label="Quitar paso"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] opacity-60 transition hover:bg-[var(--bg-subtle)] hover:text-[#C96F53] group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleAddChecklist();
                }
              }}
              placeholder="Agregar un paso o requisito..."
              className="flex-1 rounded-full bg-[var(--bg-canvas)] px-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-sage)]/45"
            />
            <button
              type="button"
              onClick={() => void handleAddChecklist()}
              disabled={!newTask.trim()}
              aria-label="Agregar paso"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-ink)] text-[var(--accent-ink-fg)] transition hover:scale-105 disabled:opacity-35"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
