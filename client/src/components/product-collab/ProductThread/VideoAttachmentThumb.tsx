import { useEffect, useMemo, useState } from 'react';
import { Play } from 'lucide-react';

type ThumbState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; dataUrl: string }
  | { status: 'error' };

function captureFrame(videoSrc: string, timeSeconds: number, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = videoSrc;

    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
    };

    const onError = () => {
      cleanup();
      reject(new Error('video load error'));
    };

    const onLoadedMetadata = () => {
      const seekTo = Math.min(Math.max(0, timeSeconds), Math.max(0, (video.duration || 0) - 0.1));
      try {
        video.currentTime = Number.isFinite(seekTo) ? seekTo : 0;
      } catch {
        // 일부 브라우저에서 metadata 직후 seek가 실패할 수 있어 loadeddata에서 재시도
      }
    };

    const onLoadedData = () => {
      if (video.currentTime === 0) {
        try {
          video.currentTime = Math.min(0.1, Math.max(0, (video.duration || 0) - 0.1));
        } catch {
          // ignore
        }
      }
    };

    const onSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no canvas ctx');

        const vw = video.videoWidth || width;
        const vh = video.videoHeight || height;
        const scale = Math.min(width / vw, height / vh);
        const dw = Math.max(1, Math.floor(vw * scale));
        const dh = Math.max(1, Math.floor(vh * scale));
        const dx = Math.floor((width - dw) / 2);
        const dy = Math.floor((height - dh) / 2);

        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(video, dx, dy, dw, dh);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        cleanup();
        resolve(dataUrl);
      } catch (e) {
        cleanup();
        reject(e instanceof Error ? e : new Error('capture error'));
      }
    };

    video.addEventListener('error', onError, { once: true });
    video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
    video.addEventListener('loadeddata', onLoadedData, { once: true });
    video.addEventListener('seeked', onSeeked, { once: true });
  });
}

export function VideoAttachmentThumb({
  src,
  alt,
  className,
  width = 64,
  height = 64,
}: {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
}) {
  const [state, setState] = useState<ThumbState>({ status: 'idle' });

  const stableSrc = useMemo(() => src, [src]);

  useEffect(() => {
    if (!stableSrc) return;
    let cancelled = false;
    setState({ status: 'loading' });
    captureFrame(stableSrc, 0.1, width, height)
      .then((dataUrl) => {
        if (cancelled) return;
        setState({ status: 'ready', dataUrl });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [stableSrc, width, height]);

  return (
    <div
      className={
        className ??
        'w-16 h-16 rounded border border-[#E5E7EB] overflow-hidden bg-[#111827] relative flex items-center justify-center'
      }
      style={{ width, height }}
      aria-label={alt ?? 'video thumbnail'}
    >
      {state.status === 'ready' ? (
        <img src={state.dataUrl} alt={alt ?? ''} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#111827]">
          <span className="text-[10px] text-white/70">{state.status === 'loading' ? 'Loading…' : 'Video'}</span>
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="w-7 h-7 rounded-full bg-black/40 flex items-center justify-center">
          <Play className="w-4 h-4 text-white" />
        </span>
      </div>
    </div>
  );
}

