"use client";

import { useCallback, useRef, useState } from "react";
import { toPng } from "html-to-image";

interface Props {
  /** ref to the DOM element to capture */
  captureRef: React.RefObject<HTMLElement | null>;
  /** summary text for share links */
  shareText: string;
}

export default function ShareButtons({ captureRef, shareText }: Props) {
  const [isCapturing, setIsCapturing] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const encoded = encodeURIComponent(shareText + "\n" + siteUrl);

  const captureImage = useCallback(async (): Promise<Blob | null> => {
    if (!captureRef.current) return null;
    setIsCapturing(true);
    try {
      const dataUrl = await toPng(captureRef.current, {
        backgroundColor: "#f9fafb",
        pixelRatio: 2,
        skipFonts: true,
        filter: (node: HTMLElement) => {
          // Skip external link stylesheets that cause CORS errors
          if (node.tagName === "LINK" && (node as HTMLLinkElement).rel === "stylesheet") {
            return false;
          }
          return true;
        },
      });
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch {
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [captureRef]);

  const handleDownload = useCallback(async () => {
    const blob = await captureImage();
    if (!blob || !linkRef.current) return;
    const url = URL.createObjectURL(blob);
    linkRef.current.href = url;
    linkRef.current.download = "simulation-result.png";
    linkRef.current.click();
    URL.revokeObjectURL(url);
  }, [captureImage]);

  const handleWebShare = useCallback(async () => {
    const blob = await captureImage();
    const files = blob ? [new File([blob], "simulation-result.png", { type: "image/png" })] : [];

    if (navigator.share) {
      try {
        await navigator.share({
          title: "政策市民シミュレーター",
          text: shareText,
          url: siteUrl,
          ...(files.length && navigator.canShare?.({ files }) ? { files } : {}),
        });
      } catch {
        // user cancelled
      }
    }
  }, [captureImage, shareText, siteUrl]);

  const supportsWebShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm mb-6">
      <div className="text-xs font-semibold text-gray-500 mb-3">結果をシェア</div>
      <div className="flex flex-wrap gap-2">
        {/* Download image */}
        <button
          onClick={handleDownload}
          disabled={isCapturing}
          className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {isCapturing ? "キャプチャ中..." : "画像として保存"}
        </button>

        {/* Twitter/X */}
        <a
          href={`https://twitter.com/intent/tweet?text=${encoded}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors no-underline"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          X (Twitter)
        </a>

        {/* Facebook */}
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}&quote=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors no-underline"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </a>

        {/* LINE */}
        <a
          href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(siteUrl)}&text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors no-underline"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#06C755">
            <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967C23.101 14.479 24 12.515 24 10.304zm-16.86 3.065H5.456a.487.487 0 01-.487-.486V8.78a.487.487 0 01.487-.487.487.487 0 01.487.487v3.617h1.197a.487.487 0 01.487.487.487.487 0 01-.487.486zm2.084-.486a.487.487 0 01-.487.486.487.487 0 01-.487-.486V8.78a.487.487 0 01.487-.487.487.487 0 01.487.487v4.103zm5.142 0a.487.487 0 01-.342.464.472.472 0 01-.144.022.487.487 0 01-.399-.207l-2.23-3.038v2.759a.487.487 0 01-.487.486.487.487 0 01-.487-.486V8.78a.487.487 0 01.343-.465.49.49 0 01.543.186l2.229 3.038V8.78a.487.487 0 01.487-.487.487.487 0 01.487.487v4.103zm3.68-2.633a.487.487 0 01.487.487.487.487 0 01-.487.486h-1.197v1.174h1.197a.487.487 0 01.487.486.487.487 0 01-.487.486h-1.684a.487.487 0 01-.487-.486V8.78a.487.487 0 01.487-.487h1.684a.487.487 0 01.487.487.487.487 0 01-.487.487h-1.197v1.17h1.197z" />
          </svg>
          LINE
        </a>

        {/* Web Share API (mobile) */}
        {supportsWebShare && (
          <button
            onClick={handleWebShare}
            disabled={isCapturing}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            その他の共有
          </button>
        )}
      </div>

      {/* hidden download link */}
      <a ref={linkRef} className="hidden" />
    </div>
  );
}
