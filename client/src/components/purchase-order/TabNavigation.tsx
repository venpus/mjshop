import { useLanguage } from "../../contexts/LanguageContext";

interface TabNavigationProps {
  activeTab: "cost" | "factory" | "work" | "delivery";
  onTabChange: (tab: "cost" | "factory" | "work" | "delivery") => void;
  userLevel?: "A-SuperAdmin" | "S: Admin" | "B0: 중국Admin" | "C0: 한국Admin" | "D0: 비전 담당자";
}

export function TabNavigation({
  activeTab,
  onTabChange,
  userLevel,
}: TabNavigationProps) {
  const { t } = useLanguage();
  const isLevelC = userLevel === "C0: 한국Admin";
  return (
    <div className="flex gap-1 md:gap-2 mb-4 md:mb-6 overflow-x-auto pb-1 -mx-1 md:mx-0 md:pb-0">
      <button
        onClick={() => onTabChange("cost")}
        className={`px-3 py-2 md:px-4 md:py-2.5 font-medium transition-all rounded-t-lg border-b-2 whitespace-nowrap text-sm md:text-base shrink-0 ${
          activeTab === "cost"
            ? "bg-purple-600 text-white border-purple-600 shadow-md"
            : "bg-purple-50 text-purple-700 border-transparent hover:bg-purple-100"
        }`}
      >
        {t("purchaseOrder.detail.tabCost")}
      </button>
      {!isLevelC && (
        <button
          onClick={() => onTabChange("factory")}
          className={`px-3 py-2 md:px-4 md:py-2.5 font-medium transition-all rounded-t-lg border-b-2 whitespace-nowrap text-sm md:text-base shrink-0 ${
            activeTab === "factory"
              ? "bg-blue-600 text-white border-blue-600 shadow-md"
              : "bg-blue-50 text-blue-700 border-transparent hover:bg-blue-100"
          }`}
        >
          {t("purchaseOrder.detail.tabFactory")}
        </button>
      )}
      {!isLevelC && (
        <button
          onClick={() => onTabChange("work")}
          className={`px-3 py-2 md:px-4 md:py-2.5 font-medium transition-all rounded-t-lg border-b-2 whitespace-nowrap text-sm md:text-base shrink-0 ${
            activeTab === "work"
              ? "bg-green-600 text-white border-green-600 shadow-md"
              : "bg-green-50 text-green-700 border-transparent hover:bg-green-100"
          }`}
        >
          {t("purchaseOrder.detail.tabWork")}
        </button>
      )}
      <button
        onClick={() => onTabChange("delivery")}
        className={`px-3 py-2 md:px-4 md:py-2.5 font-medium transition-all rounded-t-lg border-b-2 whitespace-nowrap text-sm md:text-base shrink-0 ${
          activeTab === "delivery"
            ? "bg-orange-600 text-white border-orange-600 shadow-md"
            : "bg-orange-50 text-orange-700 border-transparent hover:bg-orange-100"
        }`}
      >
        {t("purchaseOrder.detail.tabDelivery")}
      </button>
    </div>
  );
}
