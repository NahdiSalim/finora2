import { useEffect, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SpreadsheetPreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; rows: string[][]; headers: string[]; sheetName: string }
  | { status: "error" };

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalise any cell value to a clean string, never null/undefined. */
function cellStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/**
 * Parse a CSV text with PapaParse.
 * Returns { headers, rows } where `rows` does NOT include the header row.
 * Handles: quoted fields, commas inside values, accents (UTF-8), irregular rows.
 */
function parseCsv(
  text: string,
  maxRows: number,
  maxCols: number,
): { headers: string[]; rows: string[][] } {
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  const rawHeaders: string[] = result.meta.fields ?? [];
  const headers = rawHeaders.slice(0, maxCols).map(cellStr);

  const rows = result.data
    .slice(0, maxRows)
    .map((row: Record<string, unknown>) => headers.map((h) => cellStr(row[h])));

  return { headers, rows };
}

/**
 * Parse an XLS/XLSX ArrayBuffer with SheetJS.
 * Returns { headers, rows } where `rows` does NOT include the header row.
 */
function parseXlsx(
  buf: ArrayBuffer,
  maxRows: number,
  maxCols: number,
): { headers: string[]; rows: string[][]; sheetName: string } {
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0] ?? "";
  const ws = wb.Sheets[sheetName];

  if (!ws) return { headers: [], rows: [], sheetName };

  // sheet_to_json with header:1 gives raw 2-D array (first row = headers)
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (raw.length === 0) return { headers: [], rows: [], sheetName };

  const headerRow = (raw[0] as unknown[]).slice(0, maxCols).map(cellStr);
  const dataRows = raw
    .slice(1, maxRows + 1)
    .map((r: unknown) => (r as unknown[]).slice(0, maxCols).map(cellStr))
    // Pad short rows so every row has the same column count
    .map((r: string[]) => {
      while (r.length < headerRow.length) r.push("");
      return r;
    });

  return { headers: headerRow, rows: dataRows, sheetName };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches a CSV / XLS / XLSX file from `url` and parses it into a structured
 * preview.  The returned `headers` array is the first row; `rows` are the data
 * rows (header excluded).
 *
 * @param url      Presigned URL of the file
 * @param enabled  Only fetch when true (avoids unnecessary requests)
 * @param maxRows  Maximum data rows to return (default 8 for cards, 50 for modal)
 * @param maxCols  Maximum columns to return (default 6)
 * @param isCsv    Pass true to force CSV parsing even if the extension is ambiguous
 */
export function useSpreadsheetPreview(
  url: string | undefined,
  enabled: boolean,
  maxRows = 8,
  maxCols = 6,
  isCsv = false,
): SpreadsheetPreviewState {
  const [state, setState] = useState<SpreadsheetPreviewState>({
    status: "idle",
  });

  useEffect(() => {
    if (!enabled || !url) {
      setState({ status: "idle" });
      return undefined;
    }

    let cancelled = false;
    setState({ status: "loading" });

    const lowerUrl = url.toLowerCase().split("?")[0]; // strip query params for extension check
    const forceCsv = isCsv || lowerUrl.endsWith(".csv");

    if (forceCsv) {
      // ── CSV path: fetch as text, parse with PapaParse ──────────────
      fetch(url)
        .then((r) => r.text())
        .then((text) => {
          if (cancelled) return;
          const { headers, rows } = parseCsv(text, maxRows, maxCols);
          if (headers.length === 0 && rows.length === 0) {
            setState({ status: "error" });
            return;
          }
          setState({ status: "ready", headers, rows, sheetName: "CSV" });
        })
        .catch(() => {
          if (!cancelled) setState({ status: "error" });
        });
    } else {
      // ── XLS/XLSX path: fetch as ArrayBuffer, parse with SheetJS ───
      fetch(url)
        .then((r) => r.arrayBuffer())
        .then((buf) => {
          if (cancelled) return;
          const { headers, rows, sheetName } = parseXlsx(buf, maxRows, maxCols);
          if (headers.length === 0 && rows.length === 0) {
            setState({ status: "error" });
            return;
          }
          setState({ status: "ready", headers, rows, sheetName });
        })
        .catch(() => {
          if (!cancelled) setState({ status: "error" });
        });
    }

    return () => {
      cancelled = true;
    };
  }, [url, enabled, maxRows, maxCols, isCsv]);

  return state;
}
