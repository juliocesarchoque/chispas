import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getMeta, registerSyncTrigger, setMeta } from '../db/dexie';
import { isSupabaseConfigured, supabase } from './supabase';
import type {
  ChecklistItem,
  Folder,
  FolderColor,
  FolderSection,
  Idea,
  IdeaKind,
  IdeaPriority,
  IdeaStatus,
} from '../types/models';

export type SyncEngineState =
  | 'local-only'
  | 'offline'
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'error';

interface RemoteFolderRow {
  id: string;
  user_id: string;
  name: string;
  section: FolderSection;
  color: FolderColor;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface RemoteIdeaRow {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  body: string;
  notes: string;
  kind: IdeaKind;
  status: IdeaStatus;
  priority: IdeaPriority;
  tags: string[];
  checklist: ChecklistItem[];
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function toRemoteFolder(folder: Folder, userId: string): RemoteFolderRow {
  return {
    id: folder.id,
    user_id: userId,
    name: folder.name,
    section: folder.section,
    color: folder.color,
    sort_order: folder.sortOrder,
    created_at: folder.createdAt,
    updated_at: folder.updatedAt,
    deleted_at: folder.deletedAt,
  };
}

function fromRemoteFolder(row: RemoteFolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    section: row.section,
    color: row.color,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: 'synced',
  };
}

function toRemoteIdea(idea: Idea, userId: string): RemoteIdeaRow {
  return {
    id: idea.id,
    user_id: userId,
    folder_id: idea.folderId,
    title: idea.title,
    body: idea.body,
    notes: idea.notes,
    kind: idea.kind,
    status: idea.status,
    priority: idea.priority,
    tags: idea.tags,
    checklist: idea.checklist,
    cover_image_url: idea.coverImageUrl ?? null,
    created_at: idea.createdAt,
    updated_at: idea.updatedAt,
    deleted_at: idea.deletedAt,
  };
}

function fromRemoteIdea(row: RemoteIdeaRow): Idea {
  return {
    id: row.id,
    folderId: row.folder_id,
    title: row.title,
    body: row.body ?? '',
    notes: row.notes ?? '',
    kind: row.kind,
    status: row.status,
    priority: row.priority,
    tags: Array.isArray(row.tags) ? row.tags : [],
    checklist: Array.isArray(row.checklist) ? row.checklist : [],
    coverImageUrl: row.cover_image_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: 'synced',
  };
}

export function useSync() {
  const [user, setUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncState, setSyncState] = useState<SyncEngineState>(() =>
    !isSupabaseConfigured ? 'local-only' : isOnline ? 'idle' : 'offline'
  );
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const pendingFoldersCount =
    useLiveQuery(() => db.folders.where('syncStatus').equals('pending').count(), []) ?? 0;
  const pendingIdeasCount =
    useLiveQuery(() => db.ideas.where('syncStatus').equals('pending').count(), []) ?? 0;
  const pendingCount = pendingFoldersCount + pendingIdeasCount;

  useEffect(() => {
    getMeta('lastSyncAt').then((val) => {
      if (val) setLastSyncAt(val);
    });
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setSyncState((prev) => (prev === 'local-only' ? 'local-only' : 'offline'));
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      setSyncState('local-only');
      return;
    }

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const syncNow = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setSyncState('local-only');
      return;
    }
    if (!user) {
      setSyncState(isOnline ? 'idle' : 'offline');
      return;
    }
    if (!navigator.onLine) {
      setSyncState('offline');
      return;
    }
    if (syncingRef.current) return;

    syncingRef.current = true;
    setSyncState('syncing');
    setLastError(null);

    try {
      // 1. Push pending folders
      const pendingFolders = await db.folders
        .where('syncStatus')
        .equals('pending')
        .toArray();
      if (pendingFolders.length > 0) {
        const payload = pendingFolders.map((f) => toRemoteFolder(f, user.id));
        const { error } = await supabase
          .from('folders')
          .upsert(payload, { onConflict: 'id' });
        if (error) throw error;

        for (const pushed of pendingFolders) {
          const current = await db.folders.get(pushed.id);
          if (current && current.updatedAt === pushed.updatedAt) {
            await db.folders.update(pushed.id, { syncStatus: 'synced' });
          }
        }
      }

      // 2. Push pending ideas
      const pendingIdeas = await db.ideas
        .where('syncStatus')
        .equals('pending')
        .toArray();
      if (pendingIdeas.length > 0) {
        const payload = pendingIdeas.map((i) => toRemoteIdea(i, user.id));
        const { error } = await supabase
          .from('ideas')
          .upsert(payload, { onConflict: 'id' });
        if (error) throw error;

        for (const pushed of pendingIdeas) {
          const current = await db.ideas.get(pushed.id);
          if (current && current.updatedAt === pushed.updatedAt) {
            await db.ideas.update(pushed.id, { syncStatus: 'synced' });
          }
        }
      }

      // 3. Pull remote changes since lastSyncAt
      const previousSync = await getMeta('lastSyncAt');
      const syncStamp = new Date().toISOString();

      let folderQuery = supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id);
      if (previousSync) {
        folderQuery = folderQuery.gt('updated_at', previousSync);
      }
      const { data: remoteFolders, error: fErr } = await folderQuery;
      if (fErr) throw fErr;

      if (remoteFolders && remoteFolders.length > 0) {
        await db.transaction('rw', db.folders, async () => {
          for (const row of remoteFolders as RemoteFolderRow[]) {
            const incoming = fromRemoteFolder(row);
            const local = await db.folders.get(incoming.id);
            if (!local || incoming.updatedAt >= local.updatedAt) {
              await db.folders.put(incoming);
            }
          }
        });
      }

      let ideaQuery = supabase
        .from('ideas')
        .select('*')
        .eq('user_id', user.id);
      if (previousSync) {
        ideaQuery = ideaQuery.gt('updated_at', previousSync);
      }
      const { data: remoteIdeas, error: iErr } = await ideaQuery;
      if (iErr) throw iErr;

      if (remoteIdeas && remoteIdeas.length > 0) {
        await db.transaction('rw', db.ideas, async () => {
          for (const row of remoteIdeas as RemoteIdeaRow[]) {
            const incoming = fromRemoteIdea(row);
            const local = await db.ideas.get(incoming.id);
            if (!local || incoming.updatedAt >= local.updatedAt) {
              await db.ideas.put(incoming);
            }
          }
        });
      }

      await setMeta('lastSyncAt', syncStamp);
      setLastSyncAt(syncStamp);
      setSyncState('synced');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al sincronizar';
      setLastError(msg);
      setSyncState(navigator.onLine ? 'error' : 'offline');
    } finally {
      syncingRef.current = false;
    }
  }, [isOnline, user]);

  // Register debounced sync trigger for local Dexie writes
  useEffect(() => {
    registerSyncTrigger(() => {
      void syncNow();
    });
    return () => registerSyncTrigger(null);
  }, [syncNow]);

  // Sync on reconnect, sign-in, or app foreground
  useEffect(() => {
    if (isOnline && user) {
      void syncNow();
    }
  }, [isOnline, user, syncNow]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine && user) {
        void syncNow();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [syncNow, user]);

  // Realtime subscription across phone & desktop
  useEffect(() => {
    if (!supabase || !user || !isOnline) return;

    const channel = supabase
      .channel(`chispa-sync-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'folders',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const row = payload.new as RemoteFolderRow | undefined;
          if (!row?.id) return;
          const incoming = fromRemoteFolder(row);
          const local = await db.folders.get(incoming.id);
          if (!local || incoming.updatedAt >= local.updatedAt) {
            await db.folders.put(incoming);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ideas',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const row = payload.new as RemoteIdeaRow | undefined;
          if (!row?.id) return;
          const incoming = fromRemoteIdea(row);
          const local = await db.ideas.get(incoming.id);
          if (!local || incoming.updatedAt >= local.updatedAt) {
            await db.ideas.put(incoming);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [user, isOnline]);

  return {
    user,
    isOnline,
    isSupabaseConfigured,
    syncState,
    pendingCount,
    lastSyncAt,
    lastError,
    syncNow,
  };
}
