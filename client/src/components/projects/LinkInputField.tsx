import { X } from "lucide-react";

interface LinkInputFieldProps {
  title: string;
  url: string;
  onTitleChange: (title: string) => void;
  onUrlChange: (url: string) => void;
  onDelete: () => void;
  index: number;
}

export function LinkInputField({
  title,
  url,
  onTitleChange,
  onUrlChange,
  onDelete,
  index,
}: LinkInputFieldProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-1 grid grid-cols-2 gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="링크 제목 (선택)"
          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://..."
          required
          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
        title="삭제"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

