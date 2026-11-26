import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  Cloud,
  CloudOff,
  FolderPlus,
  Home,
  Inbox,
  Layers,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Sun,
} from 'lucide-react';
import {
  createFolder,
  createIdea,
  db,
  moveIdeaToFolder,
  softDeleteFolder,
  updateFolder,
} from './db/dexie';
import { ensureSeedData } from './db/seed';
import { useTheme } from './hooks/useTheme';
import { useSync } from './lib/sync';
import type {
  ActiveView,
  Folder,
  FolderColor,
  FolderSection,
  Idea,
  IdeaKind,
  IdeaStatus,
} from './types/models';
import { FOLDER_COLORS, getGreeting } from './utils/constants';
import { CreativeFolderCard } from './components/CreativeFolderCard';
import { IdeaCard } from './components/IdeaCard';
import { QuickCaptureSheet } from './components/QuickCaptureSheet';
import { FolderModal } from './components/FolderModal';
import { IdeaDetailView } from './components/IdeaDetailView';
import { MoveFolderModal } from './components/MoveFolderModal';
import { AccountSyncModal } from './components/AccountSyncModal';
import { SearchModal } from './components/SearchModal';

type StatusFilter = 'all' | IdeaStatus;
type KindFilter = 'all' | IdeaKind;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'shaping', label: 'Madurando' },
  { id: 'ready', label: 'Lista' },
  { id: 'done', label: 'Hecha' },
];

export function App() {
  const { isDark, toggleLightDark } = useTheme();
  const sync = useSync();

  const [ready, setReady] = useState(false);
  const [view, setView] = useState<ActiveView>({ type: 'home' });
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [localSearch, setLocalSearch] = useState('');

  const [captureOpen, setCaptureOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [movingIdea, setMovingIdea] = useState<Idea | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  useEffect(() => {
    ensureSeedData().finally(() => setReady(true));
  }, []);

  const showToast = (
    message: string,
    actionLabel?: string,
    onAction?: () => void
  ) => {
    setToast({ message, actionLabel, onAction });
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // Global keyboard shortcuts (Ctrl+K search, Ctrl+N quick capture)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setCaptureOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const folders =
    useLiveQuery(
      () =>
        db.folders
          .filter((f) => f.deletedAt === null)
          .toArray()
          .then((list) => list.sort((a, b) => a.sortOrder - b.sortOrder)),
      []
    ) ?? [];

  const ideas =
    useLiveQuery(
      () =>
        db.ideas
          .filter((i) => i.deletedAt === null)
          .toArray()
          .then((list) =>
            list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          ),
      []
    ) ?? [];

  const folderMap = useMemo(
    () => new Map(folders.map((f) => [f.id, f])),
    [folders]
  );

  const inboxIdeas = useMemo(
    () => ideas.filter((i) => i.folderId === null && i.status !== 'archived'),
    [ideas]
  );

  const recentFolders = useMemo(
    () => folders.filter((f) => f.section === 'recent'),
    [folders]
  );
  const projectFolders = useMemo(
    () => folders.filter((f) => f.section !== 'recent'),
    [folders]
  );

  const selectedIdea = useMemo(
    () => ideas.find((i) => i.id === selectedIdeaId) ?? null,
    [ideas, selectedIdeaId]
  );

  const currentFolder =
    view.type === 'folder' ? folderMap.get(view.folderId) ?? null : null;

  const filteredListIdeas = useMemo(() => {
    let base = ideas;
    if (view.type === 'inbox') {
      base = inboxIdeas;
    } else if (view.type === 'folder') {
      base = ideas.filter(
        (i) => i.folderId === view.folderId && i.status !== 'archived'
      );
    } else if (view.type === 'all') {
      base = ideas.filter((i) => i.status !== 'archived');
    }

    if (statusFilter !== 'all') {
      base = base.filter((i) => i.status === statusFilter);
    }
    if (kindFilter !== 'all') {
      base = base.filter((i) => i.kind === kindFilter);
    }
    const q = localSearch.trim().toLowerCase();
    if (q) {
      base = base.filter((i) =>
        [i.title, i.body, i.notes, ...i.tags].join(' ').toLowerCase().includes(q)
      );
    }
    return base;
  }, [ideas, inboxIdeas, view, statusFilter, kindFilter, localSearch]);

  const handleOpenView = (next: ActiveView) => {
    setSelectedIdeaId(null);
    setStatusFilter('all');
    setKindFilter('all');
    setLocalSearch('');
    setView(next);
  };

  const handleSaveCapture = async (payload: {
    title: string;
    body: string;
    folderId: string | null;
    kind: IdeaKind;
  }) => {
    const created = await createIdea({
      title: payload.title,
      body: payload.body,
      folderId: payload.folderId,
      kind: payload.kind,
      status: payload.folderId ? 'shaping' : 'inbox',
    });
    const destName = payload.folderId
      ? folderMap.get(payload.folderId)?.name ?? 'carpeta'
      : 'Inbox';
    showToast(`Guardado en ${destName}`, 'Abrir', () => {
      setSelectedIdeaId(created.id);
    });
  };

  const handleSaveFolder = async (payload: {
    id?: string;
    name: string;
    color: FolderColor;
    section: FolderSection;
  }) => {
    if (payload.id) {
      await updateFolder(payload.id, {
        name: payload.name,
        color: payload.color,
        section: payload.section,
      });
      showToast('Carpeta actualizada');
    } else {
      const created = await createFolder({
        name: payload.name,
        color: payload.color,
        section: payload.section,
      });
      showToast(`Carpeta "${created.name}" creada`);
    }
  };

  const handleDeleteFolder = async (folder: Folder) => {
    await softDeleteFolder(folder.id);
    if (view.type === 'folder' && view.folderId === folder.id) {
      setView({ type: 'home' });
    }
    showToast('Carpeta eliminada. Sus ideas pasaron al Inbox.');
  };

  const handleMoveIdea = async (ideaId: string, folderId: string | null) => {
    await moveIdeaToFolder(ideaId, folderId);
    const dest = folderId ? folderMap.get(folderId)?.name ?? 'carpeta' : 'Inbox';
    showToast(`Movida a ${dest}`);
  };

  const defaultCaptureFolderId =
    view.type === 'folder' ? view.folderId : null;

  const syncDotColor =
    sync.syncState === 'syncing'
      ? 'bg-amber-500 animate-pulse'
      : sync.syncState === 'synced'
        ? 'bg-[#7A9184]'
        : sync.syncState === 'offline' || sync.syncState === 'error'
          ? 'bg-[#C96F53]'
          : 'bg-[var(--text-muted)]';

  return (
    <div className="min-h-dvh bg-[var(--bg-canvas)] text-[var(--text-primary)] lg:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-72 lg:shrink-0 lg:flex-col lg:border-r lg:border-[var(--border-subtle)] lg:bg-[var(--bg-surface)]/55 lg:px-5 lg:py-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleOpenView({ type: 'home' })}
            className="flex items-center gap-2.5 text-left"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--accent-ink)] text-[var(--accent-ink-fg)]">
              <Sparkles size={17} />
            </span>
            <div>
              <span className="block font-display text-lg font-bold leading-none">
                Chispa
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                Ideas y features
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={toggleLightDark}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCaptureOpen(true)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent-ink)] py-3 text-sm font-semibold text-[var(--accent-ink-fg)] shadow-sm transition hover:opacity-90 active:scale-[0.98]"
        >
          <Plus size={17} />
          <span>Nueva chispa</span>
          <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px]">
            Ctrl+N
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="mt-3 flex w-full items-center justify-between rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs text-[var(--text-muted)] transition hover:border-[var(--border-strong)]"
        >
          <span className="flex items-center gap-2">
            <Search size={14} />
            Buscar ideas...
          </span>
          <span className="rounded-md bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10px] font-semibold">
            Ctrl+K
          </span>
        </button>

        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto pr-1">
          {[
            {
              id: 'home' as const,
              label: 'Inicio · Carpetas',
              icon: Home,
              badge: null,
              active: view.type === 'home' && !selectedIdea,
            },
            {
              id: 'inbox' as const,
              label: 'Inbox rápido',
              icon: Inbox,
              badge: inboxIdeas.length,
              active: view.type === 'inbox' && !selectedIdea,
            },
            {
              id: 'all' as const,
              label: 'Todas las ideas',
              icon: Layers,
              badge: ideas.filter((i) => i.status !== 'archived').length,
              active: view.type === 'all' && !selectedIdea,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpenView({ type: item.id })}
                className={`flex w-full items-center justify-between rounded-full px-3.5 py-2.5 text-sm font-medium transition ${
                  item.active
                    ? 'bg-[var(--bg-subtle)] font-semibold text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={16} />
                  {item.label}
                </span>
                {item.badge !== null && item.badge > 0 && (
                  <span className="rounded-full bg-[var(--bg-surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="mt-6 flex items-center justify-between px-3 pb-1 pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Carpetas
            </span>
            <button
              type="button"
              onClick={() => {
                setEditingFolder(null);
                setFolderModalOpen(true);
              }}
              aria-label="Crear carpeta"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            >
              <Plus size={13} />
            </button>
          </div>

          {folders.map((folder) => {
            const active =
              view.type === 'folder' &&
              view.folderId === folder.id &&
              !selectedIdea;
            const count = ideas.filter(
              (i) => i.folderId === folder.id && i.status !== 'archived'
            ).length;
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() =>
                  handleOpenView({ type: 'folder', folderId: folder.id })
                }
                className={`flex w-full items-center justify-between rounded-full px-3.5 py-2 text-sm transition ${
                  active
                    ? 'bg-[var(--bg-subtle)] font-semibold text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]/60'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: FOLDER_COLORS[folder.color].swatch,
                    }}
                  />
                  <span className="truncate">{folder.name}</span>
                </span>
                <span className="text-xs text-[var(--text-muted)]">{count}</span>
              </button>
            );
          })}
        </nav>

        {/* Sync status pill at sidebar bottom */}
        <button
          type="button"
          onClick={() => setSyncModalOpen(true)}
          className="mt-4 flex items-center justify-between rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-left transition hover:border-[var(--border-strong)]"
        >
          <span className="flex items-center gap-2.5 text-xs font-medium text-[var(--text-primary)]">
            <span className={`h-2.5 w-2.5 rounded-full ${syncDotColor}`} />
            {!sync.isOnline
              ? 'Modo sin internet'
              : sync.user
                ? 'Sincronización activa'
                : 'Guardado local'}
          </span>
          {sync.pendingCount > 0 ? (
            <span className="rounded-full bg-[#C96F53]/16 px-2 py-0.5 text-[10px] font-semibold text-[#C96F53]">
              {sync.pendingCount}
            </span>
          ) : (
            <Cloud size={14} className="text-[var(--text-muted)]" />
          )}
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-5 pb-32 sm:px-7 sm:pt-8 lg:pb-12">
        {!ready ? (
          <div className="flex min-h-[60dvh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent-terracotta)]" />
          </div>
        ) : selectedIdea ? (
          <IdeaDetailView
            idea={selectedIdea}
            folders={folders}
            onBack={() => setSelectedIdeaId(null)}
            onToast={(m) => showToast(m)}
          />
        ) : view.type === 'home' ? (
          /* HOME VIEW: Greeting + Inbox banner + Creative Folders */
          <div className="animate-fade-in">
            {/* Top header with circular action buttons */}
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  {getGreeting()}
                </p>
                <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                  ¿Listo para capturar una chispa?
                </h1>
              </div>

              <div className="flex items-center gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={toggleLightDark}
                  aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs"
                >
                  {isDark ? <Sun size={17} /> : <Moon size={17} />}
                </button>

                <button
                  type="button"
                  onClick={() => setSyncModalOpen(true)}
                  aria-label="Sincronización y cuenta"
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs"
                >
                  {!sync.isOnline ? (
                    <CloudOff size={17} className="text-[var(--accent-terracotta)]" />
                  ) : sync.syncState === 'syncing' ? (
                    <RefreshCw size={17} className="animate-spin" />
                  ) : (
                    <Cloud size={17} />
                  )}
                  <span
                    className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-[var(--bg-surface)] ${syncDotColor}`}
                  />
                </button>
              </div>
            </header>

            {/* Quick Inbox highlight card (Ref 2 + Ref 3 softness) */}
            <section className="mt-6">
              <div
                onClick={() => handleOpenView({ type: 'inbox' })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenView({ type: 'inbox' });
                  }
                }}
                className="flex cursor-pointer items-center justify-between gap-4 rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] sm:p-5"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#C96F53]/16 text-[#B15337] dark:bg-[#D98368]/20 dark:text-[#EE9F86]">
                    <Inbox size={22} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-base font-bold text-[var(--text-primary)]">
                        Inbox rápido
                      </h2>
                      <span className="rounded-full bg-[#C96F53]/15 px-2.5 py-0.5 text-xs font-bold text-[#B15337] dark:text-[#EE9F86]">
                        {inboxIdeas.length}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                      {inboxIdeas.length > 0
                        ? `Última: "${inboxIdeas[0].title}"`
                        : 'Tus chispas nocturnas aterrizan aquí antes de ordenarlas.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCaptureOpen(true);
                  }}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-ink)] text-[var(--accent-ink-fg)] transition hover:scale-105"
                  aria-label="Anotar en Inbox"
                >
                  <Plus size={18} />
                </button>
              </div>
            </section>

            {/* Recent creative folders */}
            {recentFolders.length > 0 && (
              <section className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Recientes
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleOpenView({ type: 'all' })}
                    className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Ver todas las ideas →
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-6">
                  {recentFolders.map((folder) => (
                    <CreativeFolderCard
                      key={folder.id}
                      folder={folder}
                      ideas={ideas.filter(
                        (i) => i.folderId === folder.id && i.status !== 'archived'
                      )}
                      onOpen={(id) =>
                        handleOpenView({ type: 'folder', folderId: id })
                      }
                      onEdit={(f) => {
                        setEditingFolder(f);
                        setFolderModalOpen(true);
                      }}
                      onDelete={(f) => void handleDeleteFolder(f)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Project creative folders */}
            <section className="mt-9">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Proyectos
                </h2>

                <button
                  type="button"
                  onClick={() => {
                    setEditingFolder(null);
                    setFolderModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-subtle)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]"
                >
                  <FolderPlus size={14} />
                  Nueva carpeta
                </button>
              </div>

              {projectFolders.length === 0 && recentFolders.length === 0 ? (
                <div className="rounded-[26px] border border-dashed border-[var(--border-strong)] p-8 text-center">
                  <p className="font-display text-base font-semibold text-[var(--text-primary)]">
                    Crea tu primera carpeta creativa
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Agrupa tus features por proyecto, app o tema.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-6">
                  {projectFolders.map((folder) => (
                    <CreativeFolderCard
                      key={folder.id}
                      folder={folder}
                      ideas={ideas.filter(
                        (i) => i.folderId === folder.id && i.status !== 'archived'
                      )}
                      onOpen={(id) =>
                        handleOpenView({ type: 'folder', folderId: id })
                      }
                      onEdit={(f) => {
                        setEditingFolder(f);
                        setFolderModalOpen(true);
                      }}
                      onDelete={(f) => void handleDeleteFolder(f)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          /* LIST VIEW: Folder, Inbox, or All Ideas */
          <div className="animate-fade-in">
            <header className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenView({ type: 'home' })}
                  aria-label="Volver al inicio"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs transition hover:bg-[var(--bg-subtle)]"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {currentFolder && (
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            FOLDER_COLORS[currentFolder.color].swatch,
                        }}
                      />
                    )}
                    <h1 className="truncate font-display text-2xl font-bold text-[var(--text-primary)]">
                      {view.type === 'inbox'
                        ? 'Inbox rápido'
                        : view.type === 'all'
                          ? 'Todas las ideas'
                          : currentFolder?.name ?? 'Carpeta'}
                    </h1>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {filteredListIdeas.length}{' '}
                    {filteredListIdeas.length === 1 ? 'idea' : 'ideas'}
                    {view.type === 'inbox' &&
                      ' · Toca el botón de carpeta para ordenar'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCaptureOpen(true)}
                aria-label="Nueva idea aquí"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-ink)] text-[var(--accent-ink-fg)] shadow-sm transition hover:scale-105"
              >
                <Plus size={18} />
              </button>
            </header>

            {/* Local filter search bar */}
            <div className="mt-5 flex items-center gap-2.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 shadow-2xs">
              <Search size={16} className="text-[var(--text-muted)]" />
              <input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Filtrar en esta vista..."
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />
            </div>

            {/* Pill filters (Reference 3 style) */}
            <div className="mt-3.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {view.type !== 'inbox' &&
                STATUS_FILTERS.map((sf) => {
                  const active = statusFilter === sf.id;
                  return (
                    <button
                      key={sf.id}
                      type="button"
                      onClick={() => setStatusFilter(sf.id)}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                        active
                          ? 'bg-[var(--accent-ink)] text-[var(--accent-ink-fg)]'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      {sf.label}
                    </button>
                  );
                })}

              {view.type !== 'inbox' && (
                <span className="mx-1 h-4 w-px shrink-0 bg-[var(--border-strong)]" />
              )}

              {(
                [
                  { id: 'all', label: 'Todo tipo' },
                  { id: 'idea', label: 'Idea' },
                  { id: 'feature', label: 'Feature' },
                  { id: 'ux', label: 'UX' },
                  { id: 'bug', label: 'Bug' },
                ] as const
              ).map((kf) => {
                const active = kindFilter === kf.id;
                return (
                  <button
                    key={kf.id}
                    type="button"
                    onClick={() => setKindFilter(kf.id)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'bg-[#7A9184] text-white'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    {kf.label}
                  </button>
                );
              })}
            </div>

            {/* Ideas list */}
            <div className="mt-5 space-y-3">
              {filteredListIdeas.length === 0 ? (
                <div className="rounded-[26px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)]/45 p-10 text-center">
                  <p className="font-display text-base font-semibold text-[var(--text-primary)]">
                    No hay ideas aquí todavía
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Toca el botón redondo + para capturar una chispa en 2 segundos.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCaptureOpen(true)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-ink)] px-5 py-2.5 text-xs font-semibold text-[var(--accent-ink-fg)]"
                  >
                    <Plus size={14} />
                    Anotar idea
                  </button>
                </div>
              ) : (
                filteredListIdeas.map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    folder={
                      idea.folderId ? folderMap.get(idea.folderId) : undefined
                    }
                    showMoveButton={view.type === 'inbox'}
                    onOpen={(id) => setSelectedIdeaId(id)}
                    onQuickMove={(item) => setMovingIdea(item)}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Floating Bottom Bar + Prominent Circular '+' Button (Ref 1 + Ref 3) */}
      {!selectedIdea && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-center justify-center px-4 pb-safe lg:hidden">
          <div className="pointer-events-auto mb-3 flex items-center gap-3">
            <nav className="flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 p-1.5 shadow-[var(--shadow-float)] backdrop-blur-md">
              <button
                type="button"
                onClick={() => handleOpenView({ type: 'home' })}
                className={`inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition ${
                  view.type === 'home'
                    ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <Home size={17} />
                <span>Inicio</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenView({ type: 'inbox' })}
                className={`relative inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition ${
                  view.type === 'inbox'
                    ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <Inbox size={17} />
                <span>Inbox</span>
                {inboxIdeas.length > 0 && (
                  <span className="rounded-full bg-[#C96F53] px-1.5 py-0.2 text-[10px] font-bold text-white">
                    {inboxIdeas.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Buscar"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--bg-subtle)]"
              >
                <Search size={17} />
              </button>
            </nav>

            <button
              type="button"
              onClick={() => setCaptureOpen(true)}
              aria-label="Capturar nueva chispa"
              className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-ink)] text-[var(--accent-ink-fg)] shadow-[var(--shadow-float)] transition hover:scale-105 active:scale-95"
            >
              <Plus size={24} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      )}

      {/* Modals & Sheets */}
      <QuickCaptureSheet
        open={captureOpen}
        folders={folders}
        defaultFolderId={defaultCaptureFolderId}
        onClose={() => setCaptureOpen(false)}
        onSave={handleSaveCapture}
      />

      <FolderModal
        open={folderModalOpen}
        editingFolder={editingFolder}
        onClose={() => setFolderModalOpen(false)}
        onSave={handleSaveFolder}
      />

      <MoveFolderModal
        idea={movingIdea}
        folders={folders}
        onClose={() => setMovingIdea(null)}
        onSelectFolder={handleMoveIdea}
      />

      <SearchModal
        open={searchOpen}
        ideas={ideas.filter((i) => i.status !== 'archived')}
        folders={folders}
        onClose={() => setSearchOpen(false)}
        onSelectIdea={(id) => setSelectedIdeaId(id)}
      />

      <AccountSyncModal
        open={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        user={sync.user}
        isOnline={sync.isOnline}
        isSupabaseConfigured={sync.isSupabaseConfigured}
        syncState={sync.syncState}
        pendingCount={sync.pendingCount}
        lastSyncAt={sync.lastSyncAt}
        lastError={sync.lastError}
        onSyncNow={sync.syncNow}
        onToast={(m) => showToast(m)}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="animate-sheet-up fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[var(--accent-ink)] px-4 py-2.5 text-xs font-semibold text-[var(--accent-ink-fg)] shadow-[var(--shadow-float)] lg:bottom-6">
          <span>{toast.message}</span>
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                setToast(null);
              }}
              className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold hover:bg-white/30"
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
