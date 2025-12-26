import { ArrowLeft, Edit } from "lucide-react";

interface DetailHeaderProps {
  onBack: () => void;
  onEdit?: () => void;
  title?: string;
}

export function DetailHeader({ 
  onBack, 
  onEdit,
  title = "발주 상세",
}: DetailHeaderProps) {
  return (
    <div className="mb-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>목록으로 돌아가기</span>
      </button>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-gray-900">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Edit className="w-5 h-5" />
              <span>수정</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
