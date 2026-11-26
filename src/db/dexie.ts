import Dexie, { type Table } from 'dexie';
import type {
  ChecklistItem,
  Folder,
  FolderColor,
  FolderSection,
  Idea,
  IdeaKind,
  IdeaPriority,
  IdeaStatus,
  MetaEntry,
} from '../types/models';

export class ChispaDB extends Dexie {
  folders!: Table<Folder, string>;
  ideas!: Table<Idea, string>;
  meta!: Table<MetaEntry, string>;

  constructor() {
    super('chispa_local_db');
    this.version(1).stores({
      folders: 'id, section, updatedAt, syncStatus, deletedAt',
      ideas: 'id, folderId, status, kind, updatedAt, syncStatus, deletedAt',
      meta: 'key',
    });
  }
}

export const db = new ChispaDB();

let syncTriggerCallback: (() => void) | null = null;
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function registerSyncTrigger(cb: (() => void) | null) {
  syncTriggerCallback = cb;
}

function scheduleSync() {
  if (!syncTriggerCallback) return;
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }
  syncDebounceTimer = setTimeout(() => {
    syncTriggerCallback?.();
  }, 1500);
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getMeta(key: string): Promise<string | null> {
  const row = await db.meta.get(key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await db.meta.put({ key, value });
}

export interface CreateFolderInput {
  name: string;
  color: FolderColor;
  section?: FolderSection;
}

export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  const now = new Date().toISOString();
  const existingCount = await db.folders.count();
  const folder: Folder = {
    id: newId(),
    name: input.name.trim() || 'Nueva carpeta',
    section: input.section ?? 'projects',
    color: input.color,
    sortOrder: existingCount,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: 'pending',
  };
  await db.folders.put(folder);
  scheduleSync();
  return folder;
}

export async function updateFolder(
  id: string,
  patch: Partial<Pick<Folder, 'name' | 'color' | 'section' | 'sortOrder'>>
): Promise<void> {
  const existing = await db.folders.get(id);
  if (!existing) return;
  await db.folders.put({
    ...existing,
    ...patch,
    name: patch.name !== undefined ? patch.name.trim() || existing.name : existing.name,
    updatedAt: new Date().toISOString(),
    syncStatus: 'pending',
  });
  scheduleSync();
}

export async function softDeleteFolder(id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction('rw', db.folders, db.ideas, async () => {
    const folder = await db.folders.get(id);
    if (folder) {
      await db.folders.put({
        ...folder,
        deletedAt: now,
        updatedAt: now,
        syncStatus: 'pending',
      });
    }
    // Move active ideas in this folder back to Inbox so nothing is lost
    const folderIdeas = await db.ideas
      .where('folderId')
      .equals(id)
      .filter((item) => item.deletedAt === null)
      .toArray();
    for (const idea of folderIdeas) {
      await db.ideas.put({
        ...idea,
        folderId: null,
        status: idea.status === 'inbox' ? 'inbox' : idea.status,
        updatedAt: now,
        syncStatus: 'pending',
      });
    }
  });
  scheduleSync();
}

export interface CreateIdeaInput {
  title: string;
  body?: string;
  notes?: string;
  folderId?: string | null;
  kind?: IdeaKind;
  status?: IdeaStatus;
  priority?: IdeaPriority;
  tags?: string[];
  checklist?: ChecklistItem[];
}

export async function createIdea(input: CreateIdeaInput): Promise<Idea> {
  const now = new Date().toISOString();
  const folderId = input.folderId ?? null;
  const idea: Idea = {
    id: newId(),
    folderId,
    title: input.title.trim(),
    body: input.body ?? '',
    notes: input.notes ?? '',
    kind: input.kind ?? 'idea',
    status: input.status ?? (folderId ? 'shaping' : 'inbox'),
    priority: input.priority ?? 'medium',
    tags: input.tags ?? [],
    checklist: input.checklist ?? [],
    coverImageUrl: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: 'pending',
  };
  await db.ideas.put(idea);
  scheduleSync();
  return idea;
}

export async function updateIdea(
  id: string,
  patch: Partial<
    Pick<
      Idea,
      | 'folderId'
      | 'title'
      | 'body'
      | 'notes'
      | 'kind'
      | 'status'
      | 'priority'
      | 'tags'
      | 'checklist'
      | 'coverImageUrl'
    >
  >
): Promise<void> {
  const existing = await db.ideas.get(id);
  if (!existing) return;
  await db.ideas.put({
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
    syncStatus: 'pending',
  });
  scheduleSync();
}

export async function moveIdeaToFolder(
  id: string,
  folderId: string | null
): Promise<void> {
  const existing = await db.ideas.get(id);
  if (!existing) return;
  const nextStatus: IdeaStatus =
    folderId && existing.status === 'inbox' ? 'shaping' : existing.status;
  await db.ideas.put({
    ...existing,
    folderId,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
    syncStatus: 'pending',
  });
  scheduleSync();
}

export async function softDeleteIdea(id: string): Promise<void> {
  const existing = await db.ideas.get(id);
  if (!existing) return;
  const now = new Date().toISOString();
  await db.ideas.put({
    ...existing,
    deletedAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  });
  scheduleSync();
}
