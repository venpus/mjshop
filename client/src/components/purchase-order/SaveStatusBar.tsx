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
    <div className="flex items-center justify-between mb-4">
      <div className="flex-1">
        {lastSavedAt && (
          <p className="text-sm text-gray-500">
            마지막 저장: {formatDateTime(lastSavedAt)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {onSave && (
          <button
            onClick={onSave}
            disabled={!isDirty || isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isDirty && !isSaving
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>저장 중...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>저장</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

