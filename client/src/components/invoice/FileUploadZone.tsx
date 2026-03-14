import { Upload } from 'lucide-react';

export interface FileUploadZoneProps {
  label: string;
  accept?: string;
  multiple?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
  placeholder?: string;
  /** 업로드된 파일명 목록 표시 (기본 true) */
  showFileNames?: boolean;
}

export function FileUploadZone({
  label,
  accept,
  multiple = false,
  files,
  onChange,
  disabled = false,
  compact = false,
  placeholder = '파일 선택',
  showFileNames = true,
}: FileUploadZoneProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    onChange(multiple ? selected : selected.slice(0, 1));
    e.target.value = '';
  };

  const labelText = files.length
    ? multiple
      ? `${files.length}개 파일`
      : files[0].name
    : placeholder;

  return (
    <div className={compact ? 'flex flex-col min-w-0' : 'flex flex-col'}>
      <span className="text-xs font-medium text-gray-600 mb-1 truncate">{label}</span>
      <label
        className={`
          flex items-center gap-2 border border-gray-300 rounded cursor-pointer
          hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed
          ${compact ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'}
        `}
      >
        <Upload className="w-4 h-4 text-gray-500 shrink-0" />
        <span className="truncate text-gray-700">{labelText}</span>
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />
      </label>
      {showFileNames && files.length > 0 && (
        <ul className="mt-1 space-y-0.5 max-h-20 overflow-y-auto">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="text-xs text-gray-600 truncate" title={f.name}>
              · {f.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
