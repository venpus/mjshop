import { Factory, Wrench, Truck, CreditCard } from "lucide-react";
import { type WorkItem } from "./tabs/ProcessingPackagingTab";

interface ProgressStatusSectionProps {
  // 업체 출고 관련
  currentFactoryStatus: string;
  totalShippedQuantity: number;
  totalReturnQuantity: number;
  totalReceivedQuantity: number;
  hasFactoryShipments: boolean;
  hasReturnItems: boolean;
  
  // 작업 관련
  workStatus: string;
  workItems: WorkItem[];
  
  // 배송 관련
  deliveryStatus: string;
  
  // 결제 관련
  paymentStatus: string;
}

export function ProgressStatusSection({
  currentFactoryStatus,
  totalShippedQuantity,
  totalReturnQuantity,
  totalReceivedQuantity,
  hasFactoryShipments,
  hasReturnItems,
  workStatus,
  workItems,
  deliveryStatus,
  paymentStatus,
}: ProgressStatusSectionProps) {
  // 작업 완료 개수 계산
  const completedWorkCount = workItems.filter(item => item.isCompleted === true).length;
  const totalWorkCount = workItems.length;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 bg-gradient-to-r from-cyan-50 to-sky-50 px-4 py-2 rounded-lg border border-cyan-200 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-sky-500 rounded-lg flex items-center justify-center shadow-md">
          <Factory className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">진행 상태</h3>
      </div>
      
      <div className="space-y-4">
        {/* Factory Status */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Factory className="w-4 h-4 text-gray-600" />
            <span className="text-gray-600 text-sm">업체 출고</span>
            {(hasFactoryShipments || hasReturnItems) && (
              <span className="text-sm text-gray-600">
                (입고:{" "}
                <span className="font-semibold text-green-600">
                  {totalShippedQuantity.toLocaleString()}
                </span>
                개
                {totalReturnQuantity > 0 && (
                  <>
                    {" "}
                    - 불량/반품:{" "}
                    <span className="font-semibold text-red-600">
                      {totalReturnQuantity.toLocaleString()}
                    </span>
                    개
                  </>
                )}{" "}
                = 총 입고:{" "}
                <span className="font-semibold text-blue-600">
                  {totalReceivedQuantity.toLocaleString()}
                </span>
                개)
              </span>
            )}
          </div>
          <span
            className={`inline-flex px-3 py-1.5 rounded-full text-sm ${
              currentFactoryStatus === "수령완료"
                ? "bg-green-100 text-green-800"
                : currentFactoryStatus === "배송중"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
            }`}
          >
            {currentFactoryStatus}
          </span>
        </div>

        {/* Work Status */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-4 h-4 text-gray-600" />
            <span className="text-gray-600 text-sm">작업</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span
              className={`inline-flex px-2.5 py-1 rounded-full text-xs w-fit ${
                workStatus === "완료"
                  ? "bg-green-100 text-green-800"
                  : workStatus === "작업중"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {workStatus}
            </span>
            {totalWorkCount > 0 && (
              <span className="text-xs text-gray-600">
                {totalWorkCount}개 중 {completedWorkCount}개 완료
              </span>
            )}
          </div>
        </div>

        {/* Delivery Status (임시 주석처리) */}
        {/* <div>
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-4 h-4 text-gray-600" />
            <span className="text-gray-600 text-sm">배송</span>
          </div>
          <span
            className={`inline-flex px-3 py-1.5 rounded-full text-sm ${
              deliveryStatus === "한국도착"
                ? "bg-green-100 text-green-800"
                : deliveryStatus === "통관및 배달"
                  ? "bg-emerald-100 text-emerald-800"
                  : deliveryStatus === "항공운송중"
                    ? "bg-sky-100 text-sky-800"
                    : deliveryStatus === "해운운송중"
                      ? "bg-blue-100 text-blue-800"
                      : deliveryStatus === "중국운송중"
                        ? "bg-indigo-100 text-indigo-800"
                        : "bg-purple-100 text-purple-800"
            }`}
          >
            {deliveryStatus}
          </span>
        </div> */}

        {/* Payment Status */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-gray-600" />
            <span className="text-gray-600 text-sm">결제</span>
          </div>
          <span
            className={`inline-flex px-3 py-1.5 rounded-full text-sm ${
              paymentStatus === "완료"
                ? "bg-green-100 text-green-800"
                : paymentStatus === "선금결제"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
            }`}
          >
            {paymentStatus}
          </span>
        </div>
      </div>
    </div>
  );
}