import { useState } from 'react';
import { Download } from 'lucide-react';

export interface FileDownloadIconButtonProps {
  /** 접근성·툴팁용 파일 표시 이름 */
  fileLabel: string;
  onDownload: () => Promise<void>;
  disabled?: boolean;
}

export function FileDownloadIconButton({ fileLabel, onDownload, disabled }: FileDownloadIconButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onDownload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '다운로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className="inline-flex shrink-0 p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-40"
      title={`다운로드: ${fileLabel}`}
      aria-label={`다운로드 ${fileLabel}`}
    >
      <Download className={`w-3.5 h-3.5 ${loading ? 'animate-pulse' : ''}`} />
    </button>
  );
}
