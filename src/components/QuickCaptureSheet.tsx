import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Inbox, X } from 'lucide-react';
import type { Folder, IdeaKind } from '../types/models';
import { FOLDER_COLORS, KIND_META } from '../utils/constants';

interface QuickCaptureSheetProps {
  open: boolean;
  folders: Folder[];
  defaultFolderId: string | null;
  onClose: () => void;
  onSave: (payload: {
    title: string;
    body: string;
    folderId: string | null;
    kind: IdeaKind;
  }) => Promise<void>;
}

const KINDS: IdeaKind[] = ['idea', 'feature', 'ux', 'bug'];

export function QuickCaptureSheet({
  open,
  folders,
  defaultFolderId,
  onClose,
  onSave,
}: QuickCaptureSheetProps) {
  const [text, setText] = useState('');
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId);
  const [kind, setKind] = useState<IdeaKind>('idea');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setFolderId(defaultFolderId);
      setKind('idea');
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [open, defaultFolderId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const lines = trimmed.split('\n');
      const title = lines[0].trim();
      const body = lines.slice(1).join('\n').trim();
      await onSave({ title, body, folderId, kind });
      setText('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up w-full max-w-lg rounded-t-[28px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 pb-safe shadow-[var(--shadow-float)] sm:rounded-[28px] sm:p-6"
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-terracotta)]" />
            <span className="font-display text-sm font-semibold text-[var(--text-primary)]">
              Chispa rápida
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar captura rápida"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        </div>

        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              void handleSubmit();
            }
          }}
          rows={4}
          placeholder="¿Qué idea se te ocurrió? Escríbela aquí... (la primera línea será el título)"
          className="w-full resize-none rounded-2xl bg-[var(--bg-canvas)] px-4 py-3.5 text-[15px] leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-sage)]/50"
        />

        {/* Kind selector pills */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {KINDS.map((k) => {
            const active = kind === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
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

        {/* Folder destination pills + round send button */}
        <div className="mt-3.5 flex items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setFolderId(null)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                folderId === null
                  ? 'bg-[#C96F53]/18 text-[#B15337] dark:bg-[#D98368]/22 dark:text-[#EE9F86]'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Inbox size={12} />
              Inbox
            </button>

            {folders.map((folder) => {
              const active = folderId === folder.id;
              const palette = FOLDER_COLORS[folder.color];
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setFolderId(folder.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'bg-[var(--accent-ink)] text-[var(--accent-ink-fg)]'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: palette.swatch }}
                  />
                  {folder.name}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!text.trim() || saving}
            onClick={() => void handleSubmit()}
            aria-label="Guardar idea"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent-ink)] text-[var(--accent-ink-fg)] shadow-md transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp size={20} strokeWidth={2.4} />
          </button>
        </div>

        <p className="mt-2.5 text-[11px] text-[var(--text-muted)]">
          Se guarda al instante en este dispositivo aunque estés sin internet. Tip: Ctrl + Enter para enviar.
        </p>
      </div>
    </div>
  );
}
