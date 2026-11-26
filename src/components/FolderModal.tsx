import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import type { Folder, FolderColor, FolderSection } from '../types/models';
import { FOLDER_COLORS } from '../utils/constants';

interface FolderModalProps {
  open: boolean;
  editingFolder: Folder | null;
  onClose: () => void;
  onSave: (payload: {
    id?: string;
    name: string;
    color: FolderColor;
    section: FolderSection;
  }) => Promise<void>;
}

const COLOR_KEYS: FolderColor[] = [
  'terracotta',
  'sage',
  'sky',
  'lavender',
  'amber',
  'stone',
];

export function FolderModal({
  open,
  editingFolder,
  onClose,
  onSave,
}: FolderModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<FolderColor>('terracotta');
  const [section, setSection] = useState<FolderSection>('projects');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingFolder) {
      setName(editingFolder.name);
      setColor(editingFolder.color);
      setSection(editingFolder.section);
    } else {
      setName('');
      setColor('terracotta');
      setSection('projects');
    }
  }, [open, editingFolder]);

  if (!open) return null;

  const palette = FOLDER_COLORS[color];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({
        id: editingFolder?.id,
        name: name.trim(),
        color,
        section,
      });
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
      <form
        onSubmit={(e) => void handleSubmit(e)}
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up w-full max-w-md rounded-t-[28px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 pb-safe shadow-[var(--shadow-float)] sm:rounded-[28px]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
            {editingFolder ? 'Editar carpeta' : 'Nueva carpeta'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Live miniature creative folder preview */}
        <div className="mb-5 flex justify-center">
          <div className="relative h-24 w-36 pt-3">
            <div
              className="absolute left-0 top-0 h-4 w-16 rounded-t-xl transition-colors"
              style={{ backgroundColor: palette.back }}
            />
            <div
              className="absolute inset-x-0 top-2 bottom-0 rounded-2xl transition-colors"
              style={{ backgroundColor: palette.back }}
            />
            <div className="absolute inset-x-4 top-0.5 h-12 rounded-lg border border-black/5 bg-[var(--bg-surface)] p-2 shadow-sm">
              <div className="h-1.5 w-10 rounded-full bg-[var(--bg-hover)]" />
              <div className="mt-1.5 h-1.5 w-14 rounded-full bg-[var(--bg-subtle)]" />
            </div>
            <div
              className="absolute inset-x-0 bottom-0 flex h-14 items-end rounded-2xl border-t border-white/30 p-3 shadow-md transition-all"
              style={{ background: palette.frontGradient }}
            >
              <span
                className="truncate text-xs font-semibold"
                style={{ color: palette.textOnFront }}
              >
                {name.trim() || 'Mi proyecto'}
              </span>
            </div>
          </div>
        </div>

        <label className="block text-xs font-semibold text-[var(--text-secondary)]">
          Nombre del proyecto o tema
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. App de Finanzas, Rediseño Web..."
          className="mt-1.5 w-full rounded-2xl bg-[var(--bg-canvas)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-sage)]/50"
        />

        <label className="mt-4 block text-xs font-semibold text-[var(--text-secondary)]">
          Color de carpeta
        </label>
        <div className="mt-2 flex items-center gap-2.5">
          {COLOR_KEYS.map((key) => {
            const swatch = FOLDER_COLORS[key];
            const selected = color === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setColor(key)}
                aria-label={swatch.label}
                title={swatch.label}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
                  selected
                    ? 'scale-110 ring-2 ring-[var(--accent-ink)] ring-offset-2 ring-offset-[var(--bg-surface)]'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: swatch.swatch }}
              >
                {selected && <Check size={15} className="text-white" strokeWidth={2.8} />}
              </button>
            );
          })}
        </div>

        <label className="mt-4 block text-xs font-semibold text-[var(--text-secondary)]">
          Sección
        </label>
        <div className="mt-2 flex gap-2">
          {[
            { id: 'recent' as const, label: 'Destacados / Recientes' },
            { id: 'projects' as const, label: 'Proyectos' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSection(opt.id)}
              className={`flex-1 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                section === opt.id
                  ? 'bg-[var(--accent-ink)] text-[var(--accent-ink-fg)]'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[var(--bg-subtle)] px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="rounded-full bg-[var(--accent-ink)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-ink-fg)] transition hover:opacity-90 disabled:opacity-40"
          >
            {editingFolder ? 'Guardar cambios' : 'Crear carpeta'}
          </button>
        </div>
      </form>
    </div>
  );
}
