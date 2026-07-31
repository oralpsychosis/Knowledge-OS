import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CaptureUpdateAction,
  Excalidraw,
  WelcomeScreen,
  exportToBlob,
  exportToSvg,
  getSceneVersion,
  loadFromBlob,
  serializeAsJSON,
} from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import "./whiteboard.css";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import {
  Check,
  ChevronDown,
  CloudUpload,
  Download,
  FileJson,
  ImageDown,
  LoaderCircle,
  PenLine,
  Scan,
  Shapes,
  Upload,
} from "lucide-react";
import { Breadcrumbs } from "./breadcrumbs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { KnowledgePage, WhiteboardAppState, WhiteboardScene } from "@/lib/types";

interface WhiteboardEditorProps {
  page: KnowledgePage;
  syncing: boolean;
  onTitleChange: (title: string) => void;
  onSceneChange: (scene: WhiteboardScene) => void;
}

type SaveState = "saved" | "pending";

const NO_FILES = {};
const SAVE_DELAY_MS = 650;

function compactAppState(appState: AppState): WhiteboardAppState {
  return {
    gridModeEnabled: appState.gridModeEnabled,
    gridSize: appState.gridSize,
    gridStep: appState.gridStep,
    scrollX: appState.scrollX,
    scrollY: appState.scrollY,
    viewBackgroundColor: appState.viewBackgroundColor,
    zoom: appState.zoom,
  };
}

function sceneSignature(scene: WhiteboardScene): string {
  const { appState } = scene;
  return [
    getSceneVersion(scene.elements),
    appState.gridModeEnabled ? 1 : 0,
    appState.gridSize ?? "",
    appState.gridStep ?? "",
    appState.scrollX ?? 0,
    appState.scrollY ?? 0,
    appState.viewBackgroundColor ?? "",
    appState.zoom?.value ?? 1,
  ].join(":");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function safeFilename(title: string) {
  const cleaned = title
    .trim()
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return cleaned || "knowledge-os-whiteboard";
}

function hasUnsupportedElements(elements: readonly ExcalidrawElement[]) {
  return elements.some(
    (element) =>
      element.type === "image" || element.type === "embeddable" || element.type === "iframe",
  );
}

export default function WhiteboardEditor({
  page,
  syncing,
  onTitleChange,
  onSceneChange,
}: WhiteboardEditorProps) {
  const initialSceneRef = useRef<WhiteboardScene>(
    page.whiteboard ?? {
      version: 1,
      elements: [],
      appState: { viewBackgroundColor: "#f5f5f8" },
    },
  );
  const initialScene = initialSceneRef.current;
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyToPersistRef = useRef(false);
  const pendingSceneRef = useRef<WhiteboardScene | null>(null);
  const lastSignatureRef = useRef(sceneSignature(initialScene));
  const onSceneChangeRef = useRef(onSceneChange);

  useEffect(() => {
    onSceneChangeRef.current = onSceneChange;
  }, [onSceneChange]);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => {
      setNotice((current) => (current === message ? null : current));
    }, 3200);
  }, []);

  const flushPendingScene = useCallback((updateSaveState = true) => {
    const scene = pendingSceneRef.current;
    if (!scene) return;

    pendingSceneRef.current = null;
    lastSignatureRef.current = sceneSignature(scene);
    onSceneChangeRef.current(scene);
    if (updateSaveState) setSaveState("saved");
  }, []);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (persistReadyTimerRef.current !== null) {
        window.clearTimeout(persistReadyTimerRef.current);
      }
      flushPendingScene(false);
    },
    [flushPendingScene],
  );

  const handleApiReady = useCallback(
    (nextApi: ExcalidrawImperativeAPI) => {
      setApi(nextApi);
      readyToPersistRef.current = false;
      persistReadyTimerRef.current = window.setTimeout(() => {
        nextApi.updateScene({
          appState: {
            ...initialScene.appState,
            viewBackgroundColor: initialScene.appState.viewBackgroundColor ?? "#f5f5f8",
            ...(initialScene.elements.length === 0 ? { currentItemStrokeColor: "#c4b5fd" } : {}),
          },
          captureUpdate: CaptureUpdateAction.NEVER,
        });
        readyToPersistRef.current = true;
      }, 80);
    },
    [initialScene],
  );

  const handleSceneChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState) => {
      if (!readyToPersistRef.current) return;
      if (hasUnsupportedElements(elements)) {
        api?.updateScene({
          elements: elements.filter(
            (element) =>
              element.type !== "image" &&
              element.type !== "embeddable" &&
              element.type !== "iframe",
          ),
          captureUpdate: CaptureUpdateAction.NEVER,
        });
        showNotice("Images and embeds are disabled for this whiteboard");
        return;
      }

      const nextScene: WhiteboardScene = {
        version: 1,
        elements,
        appState: compactAppState(appState),
      };
      const nextSignature = sceneSignature(nextScene);

      if (
        nextSignature === lastSignatureRef.current ||
        nextSignature === (pendingSceneRef.current ? sceneSignature(pendingSceneRef.current) : null)
      ) {
        return;
      }

      pendingSceneRef.current = nextScene;
      setSaveState("pending");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(flushPendingScene, SAVE_DELAY_MS);
    },
    [api, flushPendingScene, showNotice],
  );

  const fitBoard = useCallback(() => {
    if (!api) return;
    api.scrollToContent(undefined, {
      fitToViewport: true,
      viewportZoomFactor: 0.76,
      animate: true,
      duration: 320,
    });
  }, [api]);

  const exportExcalidraw = useCallback(() => {
    if (!api) return;
    const json = serializeAsJSON(api.getSceneElements(), api.getAppState(), NO_FILES, "local");
    downloadBlob(
      new Blob([json], { type: "application/vnd.excalidraw+json" }),
      `${safeFilename(page.title)}.excalidraw`,
    );
    showNotice("Whiteboard exported");
  }, [api, page.title, showNotice]);

  const exportPng = useCallback(async () => {
    if (!api || api.getSceneElements().length === 0) {
      showNotice("Add something to the board before exporting");
      return;
    }
    const appState = api.getAppState();
    const blob = await exportToBlob({
      elements: api.getSceneElements(),
      appState: {
        ...appState,
        exportBackground: true,
        exportWithDarkMode: false,
      },
      files: null,
      mimeType: "image/png",
    });
    downloadBlob(blob, `${safeFilename(page.title)}.png`);
    showNotice("PNG exported");
  }, [api, page.title, showNotice]);

  const exportSvg = useCallback(async () => {
    if (!api || api.getSceneElements().length === 0) {
      showNotice("Add something to the board before exporting");
      return;
    }
    const appState = api.getAppState();
    const svg = await exportToSvg({
      elements: api.getSceneElements(),
      appState: {
        ...appState,
        exportBackground: true,
        exportWithDarkMode: false,
      },
      files: null,
      exportPadding: 24,
    });
    const markup = new XMLSerializer().serializeToString(svg);
    downloadBlob(
      new Blob([markup], { type: "image/svg+xml;charset=utf-8" }),
      `${safeFilename(page.title)}.svg`,
    );
    showNotice("SVG exported");
  }, [api, page.title, showNotice]);

  const importScene = useCallback(
    async (file: File) => {
      if (!api) return;
      try {
        const restored = await loadFromBlob(file, null, null);
        if (hasUnsupportedElements(restored.elements)) {
          showNotice("This MVP cannot import boards containing images or embeds");
          return;
        }
        api.updateScene({
          elements: restored.elements,
          appState: restored.appState,
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        });
        showNotice("Whiteboard imported");
      } catch {
        showNotice("That file is not a valid Excalidraw whiteboard");
      }
    },
    [api, showNotice],
  );

  const initialData = useMemo(
    () => ({
      elements: initialScene.elements,
      appState: initialScene.appState,
      scrollToContent: false,
    }),
    [initialScene],
  );

  return (
    <main className="knowledge-whiteboard flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[#0e0e14]">
      <header className="relative z-20 flex min-h-[66px] shrink-0 items-center gap-3 border-b border-white/[0.08] bg-black/45 px-4 backdrop-blur-xl md:px-5">
        <div className="min-w-0 flex-1">
          <Breadcrumbs pageId={page.id} />
          <div className="mt-1.5 flex min-w-0 items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-500/10">
              <PenLine className="size-3.5 text-violet-200/80" />
            </span>
            <input
              value={page.title}
              autoFocus={page.title === ""}
              onChange={(event) => onTitleChange(event.target.value.replace(/\n/g, ""))}
              placeholder="Untitled whiteboard"
              aria-label="Whiteboard title"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-white/90 outline-none placeholder:text-white/25"
            />
          </div>
        </div>

        <div className="hidden items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-white/35 sm:flex">
          {saveState === "pending" ? (
            <>
              <LoaderCircle className="size-3 animate-spin text-violet-300/70" />
              Queued
            </>
          ) : syncing ? (
            <>
              <CloudUpload className="size-3 animate-pulse text-violet-300/70" />
              Syncing
            </>
          ) : (
            <>
              <Check className="size-3 text-emerald-300/70" />
              Autosaved
            </>
          )}
        </div>

        <button
          type="button"
          onClick={fitBoard}
          disabled={!api}
          title="Fit whiteboard to view"
          className="flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[11px] font-medium text-white/55 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-40"
        >
          <Scan className="size-3.5" />
          <span className="hidden md:inline">Fit</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!api}
          title="Import an Excalidraw file"
          className="flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[11px] font-medium text-white/55 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-40"
        >
          <Upload className="size-3.5" />
          <span className="hidden lg:inline">Import</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".excalidraw,application/json,application/vnd.excalidraw+json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importScene(file);
            event.target.value = "";
          }}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={!api}
              aria-label="Export whiteboard"
              className="flex h-9 items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 text-[11px] font-medium text-violet-100 transition-colors hover:bg-violet-500/20 disabled:opacity-40"
            >
              <Download className="size-3.5" />
              <span className="hidden lg:inline">Export</span>
              <ChevronDown className="size-3 text-violet-200/55" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 border-white/10 bg-[#171720]/95 p-1.5 text-white/70 shadow-2xl backdrop-blur-xl"
          >
            <DropdownMenuItem
              onSelect={exportExcalidraw}
              className="rounded-lg px-2.5 py-2 text-xs focus:bg-white/[0.07] focus:text-white"
            >
              <FileJson />
              Excalidraw file
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/[0.07]" />
            <DropdownMenuItem
              onSelect={() => void exportPng()}
              className="rounded-lg px-2.5 py-2 text-xs focus:bg-white/[0.07] focus:text-white"
            >
              <ImageDown />
              PNG image
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => void exportSvg()}
              className="rounded-lg px-2.5 py-2 text-xs focus:bg-white/[0.07] focus:text-white"
            >
              <Shapes />
              SVG vector
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {notice && (
          <div className="pointer-events-none absolute right-4 top-[calc(100%+10px)] rounded-xl border border-white/10 bg-[#1a1924]/95 px-3 py-2 text-[11px] text-white/75 shadow-2xl backdrop-blur-xl">
            {notice}
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1">
        <Excalidraw
          excalidrawAPI={handleApiReady}
          initialData={initialData}
          name={page.title || "Untitled whiteboard"}
          theme="dark"
          handleKeyboardGlobally={false}
          autoFocus={false}
          validateEmbeddable={() => false}
          UIOptions={{
            canvasActions: {
              export: false,
              loadScene: false,
              saveAsImage: false,
              saveToActiveFile: false,
              toggleTheme: false,
            },
            tools: { image: false },
          }}
          onChange={handleSceneChange}
          onPaste={(_, event) => {
            const containsImage = Array.from(event?.clipboardData.files ?? []).some((file) =>
              file.type.startsWith("image/"),
            );
            if (containsImage) {
              showNotice("Images are disabled for this whiteboard");
              return false;
            }
            return true;
          }}
        >
          <WelcomeScreen>
            <WelcomeScreen.Center>
              <WelcomeScreen.Center.Logo>
                <span className="flex items-center justify-center gap-2 text-sm font-semibold tracking-[0.08em]">
                  <PenLine className="size-5 text-violet-300" />
                  KNOWLEDGE OS
                </span>
              </WelcomeScreen.Center.Logo>
              <WelcomeScreen.Center.Heading>
                Think spatially. Keep it loose.
              </WelcomeScreen.Center.Heading>
              <WelcomeScreen.Center.Menu>
                <WelcomeScreen.Center.MenuItem
                  icon={<PenLine />}
                  onSelect={() => api?.setActiveTool({ type: "freedraw" })}
                >
                  Start drawing
                </WelcomeScreen.Center.MenuItem>
                <WelcomeScreen.Center.MenuItem
                  icon={<Shapes />}
                  onSelect={() => api?.setActiveTool({ type: "rectangle" })}
                >
                  Build a flow
                </WelcomeScreen.Center.MenuItem>
              </WelcomeScreen.Center.Menu>
            </WelcomeScreen.Center>
            <WelcomeScreen.Hints.ToolbarHint>
              Shapes, arrows, text, and frames live up here
            </WelcomeScreen.Hints.ToolbarHint>
          </WelcomeScreen>
        </Excalidraw>
      </div>
    </main>
  );
}
