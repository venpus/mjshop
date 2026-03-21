import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

/** 처리 중 표시: 말줄임 점이 늘었다 줄어드는 틱 애니메이션 */
const PROCESSING_DOT_PHASES = ['.', '..', '...', '..'] as const;

export function ProcessingEllipsis({
  active,
  label = '처리 중',
  intervalMs = 420,
}: {
  active: boolean;
  label?: string;
  intervalMs?: number;
}) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) {
      setPhase(0);
      return;
    }
    const id = window.setInterval(() => {
      setPhase((p) => (p + 1) % PROCESSING_DOT_PHASES.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);

  if (!active) return null;

  return (
    <span className="inline-flex items-baseline">
      {label}
      <span className="inline-block min-w-[3ch] text-left">{PROCESSING_DOT_PHASES[phase]}</span>
    </span>
  );
}

export interface TerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  logs: string[];
  /** 진행 중일 때 하단에 스피너 표시 */
  isRunning?: boolean;
}

export function TerminalModal({ isOpen, onClose, title, logs, isRunning }: TerminalModalProps) {
  const scrollRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isOpen, logs]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-[#2d3748] bg-[#0d1117] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#2d3748] px-4 py-2">
          <span className="font-mono text-sm font-medium text-[#8b949e]">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-[#8b949e] hover:bg-[#21262d] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <pre
          ref={scrollRef}
          className="max-h-[60vh] min-h-[200px] overflow-auto px-4 py-3 font-mono text-[13px] leading-relaxed text-[#c9d1d9]"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace' }}
        >
          {logs.length === 0 && !isRunning && (
            <span className="text-[#6e7681]">대기 중...</span>
          )}
          {logs.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap">
              <span className="text-[#7ee787]">$ </span>
              {line}
            </div>
          ))}
          {isRunning && (
            <div className="mt-1 flex items-center gap-2 text-[#8b949e]">
              <span className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#58a6ff]" />
              <ProcessingEllipsis active />
            </div>
          )}
        </pre>
      </div>
    </div>
  );
}
