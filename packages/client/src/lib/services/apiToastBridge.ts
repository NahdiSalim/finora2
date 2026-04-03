import type { AlertProps } from "@mui/material/Alert";

export type ApiToastSeverity = NonNullable<AlertProps["severity"]>;

type ToastHandler = (message: string, severity: ApiToastSeverity) => void;

let toastHandler: ToastHandler | null = null;

/** Called from `AlertProvider` on mount; clears on unmount. */
export function setApiToastHandler(handler: ToastHandler | null): void {
  toastHandler = handler;
}

/**
 * Dispatches a toast from non-React code (e.g. RTK `baseQuery`).
 * Uses a microtask so we never toast synchronously during reducer/query execution.
 */
export function emitApiToast(
  message: string,
  severity: ApiToastSeverity = "info",
): void {
  const text = String(message ?? "").trim();
  if (!text) return;
  queueMicrotask(() => {
    toastHandler?.(text, severity);
  });
}
