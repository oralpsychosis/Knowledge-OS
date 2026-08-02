import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";

export type JSONContent = Record<string, unknown>;

export type PageKind = "document" | "whiteboard";

export type WhiteboardAppState = Partial<
  Pick<
    AppState,
    | "gridModeEnabled"
    | "gridSize"
    | "gridStep"
    | "scrollX"
    | "scrollY"
    | "viewBackgroundColor"
    | "zoom"
  >
>;

export interface WhiteboardScene {
  version: 1;
  elements: readonly ExcalidrawElement[];
  appState: WhiteboardAppState;
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
