export type JSONContent = Record<string, unknown>;

export interface KnowledgePage {
  id: string;
  title: string;
  icon?: string;
  coverImage?: string;
  avatarImage?: string;
  parentId: string | null;
  childrenIds: string[];
  content: JSONContent;
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeOSState {
  pages: Record<string, KnowledgePage>;
  rootOrder: string[];
  activePageId: string | null;
}
