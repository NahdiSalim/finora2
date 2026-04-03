import type { DocumentItem } from "src/lib/services/documentsApi";
import type { FileItem } from "src/components/common/File";

export interface FolderItem {
  id: number;
  name: string;
  description: string;
  state: "hasFiles" | "archived" | "empty";
  fileCount?: number;
  updatedAt?: string | null;
}

export function formatSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function docToFolderState(item: DocumentItem): FolderItem["state"] {
  if (item.status === "archived") return "archived";
  const filesCount =
    typeof item.filesCount === "number" && Number.isFinite(item.filesCount)
      ? item.filesCount
      : 0;
  const foldersCount =
    typeof item.foldersCount === "number" && Number.isFinite(item.foldersCount)
      ? item.foldersCount
      : 0;
  return filesCount + foldersCount > 0 ? "hasFiles" : "empty";
}

export function docToFileType(
  type?: string | null,
  mimeType?: string | null,
): FileItem["type"] {
  const t = (type || mimeType || "").toLowerCase();
  if (t.includes("pdf")) return "pdf";
  if (t.includes("word") || t.includes("doc")) return "docx";
  if (t.includes("sheet") || t.includes("excel") || t.includes("xls"))
    return "xls";
  if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
  if (t.includes("png")) return "png";
  return "other";
}
