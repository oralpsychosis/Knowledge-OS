export type JSONContent = Record<string, unknown>;

export type PageKind = "document" | "whiteboard";

export interface WhiteboardPoint {
  x: number;
  y: number;
}

export type WhiteboardElementType = "stroke" | "rectangle" | "circle" | "line" | "text";

export interface WhiteboardElement {
  id: string;
  type: WhiteboardElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: WhiteboardPoint[]; // For freehand strokes and lines
  text?: string;
  color: string;
  size: number;
  tool?: "pen" | "eraser"; // Legacy support for strokes
}

export interface WhiteboardAppState {
  viewBackgroundColor?: string;
}

export interface WhiteboardScene {
  version: 2; // Incremented version for new element types
  elements: readonly WhiteboardElement[];
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