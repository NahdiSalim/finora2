import { useEffect, useState } from "react";
import mammoth from "mammoth";

export type DocxPreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; html: string }
  | { status: "error"; message: string };

export function useDocxPreview(
  url: string | undefined,
  enabled: boolean,
): DocxPreviewState {
  const [state, setState] = useState<DocxPreviewState>({ status: "idle" });

  useEffect(() => {
    if (!enabled || !url) {
      setState({ status: "idle" });
      return undefined;
    }

    let cancelled = false;
    setState({ status: "loading" });

    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => mammoth.convertToHtml({ arrayBuffer: buf }))
      .then((result) => {
        if (cancelled) return;
        setState({ status: "ready", html: result.value });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Conversion failed",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [url, enabled]);

  return state;
}
