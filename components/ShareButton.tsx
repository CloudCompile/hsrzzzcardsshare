"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Native share sheet where the browser has one — iOS Safari and Android Chrome both do —
 * with the card PNG attached when the platform accepts files. Desktop has no
 * `navigator.share`, so the button renders nothing there and CopyButton stays the path.
 *
 * Sharing a file means fetching the PNG the button is right next to, which is same-origin
 * and already cached by the time anyone taps it.
 */
export function ShareButton({
  url,
  title,
  text,
  file,
  label = "Share",
  className = "btn btn-ghost px-3 py-2 text-[12px]",
}: {
  url: string;
  title: string;
  text?: string;
  file?: { href: string; filename: string };
  label?: string;
  className?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Checked after mount: rendering this on the server would mismatch the client.
    setSupported(typeof navigator !== "undefined" && typeof navigator.share === "function");
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const area = document.createElement("textarea");
      area.value = url;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setCopied(false), 1800);
  }, [url]);

  const share = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      let payload: ShareData = { title, text, url };
      if (file) {
        try {
          const response = await fetch(file.href);
          if (response.ok) {
            const blob = await response.blob();
            const attached = new File([blob], file.filename, { type: blob.type || "image/png" });
            if (navigator.canShare?.({ files: [attached] })) {
              payload = { files: [attached], title, text };
            }
          }
        } catch {
          // Image fetch failed or files were refused: share the link instead.
        }
      }
      await navigator.share(payload);
    } catch (error) {
      // A closed sheet is a decision, not a failure. Anything else means the platform
      // declined, so fall back to the clipboard rather than doing nothing.
      if ((error as Error | undefined)?.name !== "AbortError") await copyLink();
    } finally {
      setBusy(false);
    }
  }, [busy, copyLink, file, text, title, url]);

  if (!supported) return null;

  return (
    <button type="button" onClick={share} disabled={busy} className={className}>
      {copied ? (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M12 16V4m0 0L8 8m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4" strokeLinecap="round" />
          </svg>
          {busy ? "Preparing…" : label}
        </>
      )}
    </button>
  );
}
