import { create } from "zustand";
import type { FileItem } from "src/components/common/File";

interface FileDrawerState {
  open: boolean;
  file: FileItem | null;
  previewContentUrl: string | null;
  openDrawer: (file: FileItem, previewContentUrl?: string | null) => void;
  closeDrawer: () => void;
}

export const useFileDrawerStore = create<FileDrawerState>((set) => ({
  open: false,
  file: null,
  previewContentUrl: null,
  openDrawer: (file, previewContentUrl = null) =>
    set({ open: true, file, previewContentUrl }),
  closeDrawer: () => set({ open: false, file: null, previewContentUrl: null }),
}));
