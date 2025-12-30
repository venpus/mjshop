interface TabNavigationProps {
  activeTab: "cost" | "factory" | "work" | "delivery";
  onTabChange: (tab: "cost" | "factory" | "work" | "delivery") => void;
}

export function TabNavigation({
  activeTab,
  onTabChange,
}: TabNavigationProps) {
  return (
    <div className="flex gap-2 mb-6">
      <button
        onClick={() => onTabChange("cost")}
        className={`px-4 py-2.5 font-medium transition-all rounded-t-lg border-b-2 ${
          activeTab === "cost"
            ? "bg-purple-600 text-white border-purple-600 shadow-md"
            : "bg-purple-50 text-purple-700 border-transparent hover:bg-purple-100"
        }`}
      >
        비용 / 결제
      </button>
      <button
        onClick={() => onTabChange("factory")}
        className={`px-4 py-2.5 font-medium transition-all rounded-t-lg border-b-2 ${
          activeTab === "factory"
            ? "bg-blue-600 text-white border-blue-600 shadow-md"
            : "bg-blue-50 text-blue-700 border-transparent hover:bg-blue-100"
        }`}
      >
        업체 출고
      </button>
      <button
        onClick={() => onTabChange("work")}
        className={`px-4 py-2.5 font-medium transition-all rounded-t-lg border-b-2 ${
          activeTab === "work"
            ? "bg-green-600 text-white border-green-600 shadow-md"
            : "bg-green-50 text-green-700 border-transparent hover:bg-green-100"
        }`}
      >
        가공/포장 작업
      </button>
      <button
        onClick={() => onTabChange("delivery")}
        className={`px-4 py-2.5 font-medium transition-all rounded-t-lg border-b-2 ${
          activeTab === "delivery"
            ? "bg-orange-600 text-white border-orange-600 shadow-md"
            : "bg-orange-50 text-orange-700 border-transparent hover:bg-orange-100"
        }`}
      >
        연관 패킹리스트
      </button>
    </div>
  );
}
