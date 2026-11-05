"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function CopyButton({
  value,
  label = "Copy link",
  className = "btn btn-ghost px-3 py-2 text-[12px]",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setCopied(false), 1800);
  }, [value]);

  return (
    <button type="button" onClick={copy} className={className}>
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
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M15 5H6a2 2 0 0 0-2 2v9" strokeLinecap="round" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
