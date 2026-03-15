import { ArrowLeft, Edit } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

interface DetailHeaderProps {
  onBack: () => void;
  onEdit?: () => void;
  title?: string;
}

export function DetailHeader({
  onBack,
  onEdit,
  title,
}: DetailHeaderProps) {
  const { t } = useLanguage();
  const displayTitle = title ?? t("purchaseOrder.detail.title");
  return (
    <div className="mb-4 md:mb-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2 md:mb-4 transition-colors text-sm md:text-base"
      >
        <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
        <span>{t("purchaseOrder.detail.backToList")}</span>
      </button>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-base md:text-lg text-gray-900 truncate">{displayTitle}</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              <Edit className="w-4 h-4 md:w-5 md:h-5" />
              <span>{t("common.edit")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
