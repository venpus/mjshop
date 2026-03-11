import { Save, Loader2 } from "lucide-react";

interface SaveStatusBarProps {
  onSave?: () => void;
  isDirty?: boolean;
  isSaving?: boolean;
  lastSavedAt?: Date | null;
}

export function SaveStatusBar({
  onSave,
  isDirty = false,
  isSaving = false,
  lastSavedAt,
}: SaveStatusBarProps) {
  const formatDateTime = (date: Date | null) => {
    if (!date) return '';
    const now = new Date(date);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3 md:mb-4">
      <div className="flex-1 min-w-0">
        {lastSavedAt && (
          <p className="text-xs md:text-sm text-gray-500 truncate">
            마지막 저장: {formatDateTime(lastSavedAt)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onSave && (
          <button
            onClick={onSave}
            disabled={!isDirty || isSaving}
            className={`flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-colors text-sm ${
              isDirty && !isSaving
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                <span>저장 중...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 md:w-5 md:h-5" />
                <span>저장</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

