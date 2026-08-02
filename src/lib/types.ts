export type JSONContent = Record<string, unknown>;

export type PageKind = "document" | "whiteboard";

export interface WhiteboardPoint {
  x: number;
  y: number;
}

export interface WhiteboardStroke {
  id: string;
  type: "stroke";
  tool: "pen" | "eraser";
  color: string;
  size: number;
  points: WhiteboardPoint[];
}

export interface WhiteboardAppState {
  viewBackgroundColor?: string;
}

export interface WhiteboardScene {
  version: 1;
  elements: readonly WhiteboardStroke[];
  appState?: WhiteboardAppState;
}

export interface KnowledgePage {
  id: string;
  title: string;
  kind?: PageKind;
  icon?: string;
  coverImage?: string;
  avatarImage?: string;
  graphX?: number;
  graphY?: number;
  parentId: string | null;
  childrenIds: string[];
  content: JSONContent;
  whiteboard?: WhiteboardScene;
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeOSState {
  pages: Record<string, KnowledgePage>;
  rootOrder: string[];
  activePageId: string | null;
}