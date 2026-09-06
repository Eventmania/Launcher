/* ------------------------------------------------------------------ */
/*  Local & shared folders via the File System Access API.             */
/*  Directory handles are persisted in IndexedDB so folders survive    */
/*  reloads (Chrome/Edge). A webkitdirectory <input> fallback works    */
/*  for the current session in other browsers.                         */
/* ------------------------------------------------------------------ */

export interface LocalFile {
  key: string;
  folderId: string;
  folderName: string;
  name: string;
  relPath: string; // path inside the folder
  size: number;
  video: boolean;
}

export interface FolderState {
  id: string;
  name: string;
  perm: "granted" | "prompt" | "unsupported";
  files: LocalFile[];
}

type DirHandle = FileSystemDirectoryHandle;

const IDB_NAME = "novadeck-local";
const STORE = "folders";
const VIDEO_EXT = /\.(mp4|mkv|webm|mov|m4v|avi)$/i;
const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|wav|flac)$/i;

const handles = new Map<string, DirHandle>();
const sessionFiles = new Map<string, File>(); // webkitdirectory fallback
const urlCache = new Map<string, string>();

const fsSupported =
  typeof window !== "undefined" && "showDirectoryPicker" in window;

function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const rq = indexedDB.open(IDB_NAME, 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore(STORE);
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
}

async function loadHandles() {
  if (!fsSupported || handles.size) return;
  try {
    const db = await idb();
    const tx = db.transaction(STORE, "readonly");
      const all = await new Promise<{ id: string; name: string; handle: DirHandle }[]>(
        (res, rej) => {
          const rq = tx.objectStore(STORE).getAll();
          rq.onsuccess = () => res((rq.result as { id: string; name: string; handle: DirHandle }[]) ?? []);
          rq.onerror = () => rej(rq.error);
        }
      );    for (const f of all ?? []) handles.set(f.id, f.handle);
  } catch {
    /* private mode etc. */
  }
}

function folderId(name: string): string {
  return "f-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.floor(Math.random() * 1e6);
}

async function scan(handle: DirHandle, folderId: string, folderName: string): Promise<LocalFile[]> {
  const out: LocalFile[] = [];
  async function walk(dir: DirHandle, rel: string, depth: number) {
    if (depth > 2 || out.length >= 300) return;
    try {
      // @ts-expect-error values() typing varies across TS libs
      for await (const entry of dir.values()) {
        if (out.length >= 300) break;
        if (entry.kind === "file") {
          if (VIDEO_EXT.test(entry.name) || AUDIO_EXT.test(entry.name)) {
            let size = 0;
            try {
              size = (await (entry as FileSystemFileHandle).getFile()).size;
            } catch {
              /* unreadable */
            }
            out.push({
              key: folderId + ":" + rel + entry.name,
              folderId,
              folderName,
              name: entry.name.replace(/\.[^.]+$/, ""),
              relPath: rel + entry.name,
              size,
              video: VIDEO_EXT.test(entry.name),
            });
          }
        } else if (entry.kind === "directory") {
          await walk(entry as DirHandle, rel + entry.name + "/", depth + 1);
        }
      }
    } catch {
      /* permission revoked mid-scan */
    }
  }
  await walk(handle, "", 0);
  out.sort(
    (a, b) => Number(b.video) - Number(a.video) || a.name.localeCompare(b.name)
  );
  return out;
}

async function permOf(h: DirHandle): Promise<"granted" | "prompt"> {
  try {
    // @ts-expect-error queryPermission exists in Chromium
    const q = await h.queryPermission({ mode: "read" });
    return q === "granted" ? "granted" : "prompt";
  } catch {
    return "prompt";
  }
}

export async function listFolders(): Promise<FolderState[]> {
  await loadHandles();
  const out: FolderState[] = [];
  for (const [id, h] of handles) {
    const perm = await permOf(h);
    out.push({
      id,
      name: h.name,
      perm,
      files: perm === "granted" ? await scan(h, id, h.name) : [],
    });
  }
  return out;
}

export async function pickFolder(onFallback?: (n: number) => void): Promise<FolderState | null> {
  await loadHandles();
  if (fsSupported) {
    try {
      // @ts-expect-error showDirectoryPicker typing varies
      const h: DirHandle = await window.showDirectoryPicker({ mode: "read" });
      // @ts-expect-error requestPermission exists in Chromium
      await h.requestPermission?.({ mode: "read" });
      const id = folderId(h.name);
      handles.set(id, h);
      try {
        const db = await idb();
        await new Promise<void>((res, rej) => {
          const tx = db.transaction(STORE, "readwrite");
          tx.objectStore(STORE).put({ id, name: h.name, handle: h });
          tx.oncomplete = () => res();
          tx.onerror = () => rej(tx.error);
        });
      } catch {
        /* session-only */
      }
      return { id, name: h.name, perm: "granted", files: await scan(h, id, h.name) };
    } catch {
      return null; // user cancelled
    }
  }
  /* fallback: one-shot folder input (this session only) */
  return new Promise((res) => {
    const input = document.createElement("input");
    input.type = "file";
    input.setAttribute("webkitdirectory", "");
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      if (!files.length) return res(null);
      const top = files[0].webkitRelativePath.split("/")[0] || "Folder";
      const id = folderId(top);
      const local: LocalFile[] = [];
      for (const f of files) {
        if (!VIDEO_EXT.test(f.name) && !AUDIO_EXT.test(f.name)) continue;
        const rel = f.webkitRelativePath.slice(top.length + 1) || f.name;
        const key = id + ":" + rel;
        sessionFiles.set(key, f);
        local.push({
          key,
          folderId: id,
          folderName: top,
          name: f.name.replace(/\.[^.]+$/, ""),
          relPath: rel,
          size: f.size,
          video: VIDEO_EXT.test(f.name),
        });
      }
      onFallback?.(local.length);
      res({ id, name: top, perm: "unsupported", files: local });
    };
    input.click();
  });
}

export async function refreshFolder(id: string): Promise<FolderState | null> {
  await loadHandles();
  const h = handles.get(id);
  if (!h) return null;
  try {
    // @ts-expect-error requestPermission exists in Chromium
    await h.requestPermission({ mode: "read" });
  } catch {
    return null;
  }
  return { id, name: h.name, perm: "granted", files: await scan(h, id, h.name) };
}

export async function removeFolder(id: string): Promise<void> {
  handles.delete(id);
  try {
    const db = await idb();
    await new Promise<void>((res) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch {
    /* noop */
  }
}

export async function fileUrl(f: LocalFile): Promise<string | null> {
  const cached = urlCache.get(f.key);
  if (cached) return cached;
  const sf = sessionFiles.get(f.key);
  if (sf) {
    const u = URL.createObjectURL(sf);
    urlCache.set(f.key, u);
    return u;
  }
  await loadHandles();
  const root = handles.get(f.folderId);
  if (!root) return null;
  try {
    const parts = f.relPath.split("/");
    let dir: DirHandle = root;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]);
    }
    const fh = await dir.getFileHandle(parts[parts.length - 1]);
    const file = await fh.getFile();
    const u = URL.createObjectURL(file);
    urlCache.set(f.key, u);
    return u;
  } catch {
    return null;
  }
}

export function fmtSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes > 1e9) return (bytes / 1e9).toFixed(1) + " GB";
  if (bytes > 1e6) return (bytes / 1e6).toFixed(0) + " MB";
  return (bytes / 1e3).toFixed(0) + " KB";
}
