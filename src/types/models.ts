export type FolderColor =
  | 'terracotta'
  | 'sage'
  | 'sky'
  | 'lavender'
  | 'amber'
  | 'stone';

export type FolderSection = 'recent' | 'projects';

export type IdeaKind = 'idea' | 'feature' | 'ux' | 'bug';

export type IdeaStatus = 'inbox' | 'shaping' | 'ready' | 'done' | 'archived';

export type IdeaPriority = 'low' | 'medium' | 'high';

export type SyncStatus = 'pending' | 'synced';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Folder {
  id: string;
  name: string;
  section: FolderSection;
  color: FolderColor;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
}

export interface Idea {
  id: string;
  folderId: string | null;
  title: string;
  body: string;
  notes: string;
  kind: IdeaKind;
  status: IdeaStatus;
  priority: IdeaPriority;
  tags: string[];
  checklist: ChecklistItem[];
  coverImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
}

export interface MetaEntry {
  key: string;
  value: string;
}

export type ActiveView =
  | { type: 'home' }
  | { type: 'inbox' }
  | { type: 'all' }
  | { type: 'folder'; folderId: string };
