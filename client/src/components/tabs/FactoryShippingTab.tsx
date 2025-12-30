import { Factory, Plus, Trash2, X, Truck } from "lucide-react";
import { handleNumberInput } from "../../utils/numberInputUtils";

export interface FactoryShipment {
  id: string;
  date: string;
  quantity: number;
  trackingNumber: string;
  receiveDate: string;
  images: string[];
  pendingImages?: File[]; // 아직 업로드되지 않은 이미지 파일들
}

export interface ReturnExchangeItem {
  id: string;
  date: string;
  quantity: number;
  trackingNumber: string;
  receiveDate: string;
  images: string[];
  pendingImages?: File[]; // 아직 업로드되지 않은 이미지 파일들
}

interface FactoryShippingTabProps {
  factoryShipments: FactoryShipment[];
  returnExchangeItems: ReturnExchangeItem[];
  currentFactoryStatus: string;
  onAddFactoryShipment: () => void;
  onRemoveFactoryShipment: (id: string) => void;
  onUpdateFactoryShipment: (id: string, field: keyof FactoryShipment, value: any) => void;
  onHandleFactoryImageUpload: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFactoryImage: (shipmentId: string, imageIndex: number, imageUrl: string) => void;
  onSetSelectedFactoryImage: (image: string) => void;
  onAddReturnExchangeItem: () => void;
  onRemoveReturnExchangeItem: (id: string) => void;
  onUpdateReturnExchangeItem: (id: string, field: keyof ReturnExchangeItem, value: any) => void;
  onHandleReturnImageUpload: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveReturnImage: (itemId: string, imageIndex: number, imageUrl: string) => void;
  onFactoryToWarehouse?: () => void; // 공장→물류창고 버튼 핸들러
}

export function FactoryShippingTab({
  factoryShipments,
  returnExchangeItems,
  currentFactoryStatus,
  onAddFactoryShipment,
  onRemoveFactoryShipment,
  onUpdateFactoryShipment,
  onHandleFactoryImageUpload,
  onRemoveFactoryImage,
  onSetSelectedFactoryImage,
  onAddReturnExchangeItem,
  onRemoveReturnExchangeItem,
  onUpdateReturnExchangeItem,
  onHandleReturnImageUpload,
  onRemoveReturnImage,
  onFactoryToWarehouse,
}: FactoryShippingTabProps) {
  return (
    <div className="space-y-6">
      {/* Factory Status */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Factory className="w-6 h-6 text-gray-700" />
            <h3 className="text-xl font-bold text-gray-900">
              업체 출고 상태
            </h3>
            {(factoryShipments.length > 0 ||
              returnExchangeItems.length > 0) && (
              <span className="text-lg text-gray-600">
                (총 입고수량:{" "}
                <span className="font-semibold text-blue-600">
                  {(
                    factoryShipments.reduce(
                      (sum, shipment) =>
                        sum + shipment.quantity,
                      0,
                    ) -
                    returnExchangeItems.reduce(
                      (sum, item) =>
                        sum + item.quantity,
                      0,
                    )
                  ).toLocaleString()}
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

        {/* 출고 항목 추가 버튼 */}
        <div className="flex items-center gap-3">
          {onFactoryToWarehouse && (
            <button
              onClick={onFactoryToWarehouse}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Truck className="w-4 h-4" />
              <span>공장→물류창고</span>
            </button>
          )}
          <button
            onClick={onAddFactoryShipment}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>출고 항목 추가</span>
          </button>
          <button
            onClick={onAddReturnExchangeItem}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>반품/교환 추가</span>
          </button>
        </div>
      </div>

      {/* Factory Shipping Information List */}
      {factoryShipments.length === 0 ? (
        <div className="bg-blue-50 rounded-lg p-8 text-center">
          <p className="text-gray-600">
            출고 항목이 없습니다. 위의 "출고 항목
            추가" 버튼을 눌러 추가해주세요.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {factoryShipments.map(
            (shipment, shipmentIndex) => (
              <div
                key={shipment.id}
                className="bg-blue-50 rounded-lg p-4 relative"
              >
                {/* 항목 번호 및 삭제 버튼 */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-blue-700">
                    출고 항목 #{shipmentIndex + 1}
                  </span>
                  <button
                    onClick={() =>
                      onRemoveFactoryShipment(
                        shipment.id,
                      )
                    }
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>삭제</span>
                  </button>
                </div>

                <div className="flex items-end gap-4">
                  {/* 날짜 */}
                  <div className="flex-1">
                    <label className="text-sm text-gray-700 mb-1.5 block">
                      출고날짜
                    </label>
                    <input
                      type="date"
                      value={shipment.date}
                      onChange={(e) =>
                        onUpdateFactoryShipment(
                          shipment.id,
                          "date",
                          e.target.value,
                        )
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 출고수량 */}
                  <div className="flex-1">
                    <label className="text-sm text-gray-700 mb-1.5 block">
                      출고수량
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={shipment.quantity || ""}
                        onChange={(e) => {
                          const processedValue = handleNumberInput(e.target.value);
                          if (processedValue !== e.target.value) {
                            e.target.value = processedValue;
                          }
                          onUpdateFactoryShipment(
                            shipment.id,
                            "quantity",
                            processedValue === "" ? 0 : parseInt(processedValue) || 0,
                          );
                        }}
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600 min-w-[20px]">
                        개
                      </span>
                    </div>
                  </div>

                  {/* 송장번호 */}
                  <div className="flex-1">
                    <label className="text-sm text-gray-700 mb-1.5 block">
                      송장번호
                    </label>
                    <input
                      type="text"
                      value={shipment.trackingNumber}
                      onChange={(e) =>
                        onUpdateFactoryShipment(
                          shipment.id,
                          "trackingNumber",
                          e.target.value,
                        )
                      }
                      placeholder="송장번호 입력"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 수령일 */}
                  <div className="flex-1">
                    <label className="text-sm text-gray-700 mb-1.5 block">
                      수령일
                    </label>
                    <input
                      type="date"
                      value={shipment.receiveDate}
                      onChange={(e) =>
                        onUpdateFactoryShipment(
                          shipment.id,
                          "receiveDate",
                          e.target.value,
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 사진 업로드 */}
                  <div>
                    <label className="text-sm text-gray-700 mb-1.5 block">
                      사진
                    </label>
                    <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white border-2 border-dashed border-blue-300 rounded-lg text-sm text-blue-700 hover:bg-blue-50 cursor-pointer transition-colors h-[38px]">
                      <Plus className="w-4 h-4" />
                      <span>추가</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) =>
                          onHandleFactoryImageUpload(
                            shipment.id,
                            e,
                          )
                        }
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* 업로드된 이미지 썸네일 */}
                  {shipment.images.length > 0 && (
                    <div className="flex items-center gap-2">
                      {shipment.images.map(
                        (image, index) => (
                          <div
                            key={index}
                            className="relative group"
                          >
                            {/* 썸네일 */}
                            <div
                              className="w-12 h-12 rounded-lg border-2 border-blue-300 overflow-hidden cursor-pointer hover:border-blue-500 transition-all"
                              onClick={() =>
                                onSetSelectedFactoryImage(
                                  image,
                                )
                              }
                            >
                              <img
                                src={image}
                                alt={`업체 출고 ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* 호버 시 크게 보기 */}
                            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100]">
                              <img
                                src={image}
                                alt={`업체 출고 ${index + 1} 미리보기`}
                                className="w-96 h-96 object-contain rounded-lg shadow-2xl border-4 border-white bg-white"
                              />
                            </div>

                            {/* 삭제 버튼 */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveFactoryImage(
                                  shipment.id,
                                  index,
                                  image,
                                );
                              }}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {/* 반품/교환 항목 섹션 */}
      <div className="border-t-2 border-gray-300 pt-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            반품/교환 항목
          </h3>
          {returnExchangeItems.length > 0 && (
            <span className="text-lg text-gray-600">
              (총 반품/교환 수량:{" "}
              <span className="font-semibold text-orange-600">
                {returnExchangeItems
                  .reduce(
                    (sum, item) =>
                      sum + item.quantity,
                    0,
                  )
                  .toLocaleString()}
              </span>
              개)
            </span>
          )}
        </div>

        {returnExchangeItems.length === 0 ? (
          <div className="bg-orange-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">
              반품/교환 항목이 없습니다. 위의
              "반품/교환 추가" 버튼을 눌러
              추가해주세요.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {returnExchangeItems.map(
              (item, itemIndex) => (
                <div
                  key={item.id}
                  className="bg-orange-50 rounded-lg p-4 relative"
                >
                  {/* 항목 번호 및 삭제 버튼 */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-orange-700">
                      반품/교환 항목 #{itemIndex + 1}
                    </span>
                    <button
                      onClick={() =>
                        onRemoveReturnExchangeItem(
                          item.id,
                        )
                      }
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>삭제</span>
                    </button>
                  </div>

                  <div className="flex items-end gap-4">
                    {/* 날짜 */}
                    <div className="flex-1">
                      <label className="text-sm text-gray-700 mb-1.5 block">
                        반품/교환 날짜
                      </label>
                      <input
                        type="date"
                        value={item.date}
                        onChange={(e) =>
                          onUpdateReturnExchangeItem(
                            item.id,
                            "date",
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    {/* 수량 */}
                    <div className="flex-1">
                      <label className="text-sm text-gray-700 mb-1.5 block">
                        수량
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={item.quantity || ""}
                          onChange={(e) => {
                            const processedValue = handleNumberInput(e.target.value);
                            if (processedValue !== e.target.value) {
                              e.target.value = processedValue;
                            }
                            onUpdateReturnExchangeItem(
                              item.id,
                              "quantity",
                              processedValue === "" ? 0 : parseInt(processedValue) || 0,
                            );
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-600">
                          개
                        </span>
                      </div>
                    </div>

                    {/* 송장번호 */}
                    <div className="flex-1">
                      <label className="text-sm text-gray-700 mb-1.5 block">
                        송장번호
                      </label>
                      <input
                        type="text"
                        value={item.trackingNumber}
                        onChange={(e) =>
                          onUpdateReturnExchangeItem(
                            item.id,
                            "trackingNumber",
                            e.target.value,
                          )
                        }
                        placeholder="송장번호 입력"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    {/* 수령일 */}
                    <div className="flex-1">
                      <label className="text-sm text-gray-700 mb-1.5 block">
                        수령일
                      </label>
                      <input
                        type="date"
                        value={item.receiveDate}
                        onChange={(e) =>
                          onUpdateReturnExchangeItem(
                            item.id,
                            "receiveDate",
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    {/* 사진 업로드 */}
                    <div>
                      <label className="text-sm text-gray-700 mb-1.5 block">
                        사진
                      </label>
                      <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white border-2 border-dashed border-orange-300 rounded-lg text-sm text-orange-700 hover:bg-orange-50 cursor-pointer transition-colors h-[38px]">
                        <Plus className="w-4 h-4" />
                        <span>추가</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) =>
                            onHandleReturnImageUpload(
                              item.id,
                              e,
                            )
                          }
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* 업로드된 이미지 썸네일 */}
                    {item.images.length > 0 && (
                      <div className="flex items-center gap-2">
                        {item.images.map(
                          (image, index) => (
                            <div
                              key={index}
                              className="relative group"
                            >
                              {/* 썸네일 */}
                              <div
                                className="w-12 h-12 rounded-lg border-2 border-orange-300 overflow-hidden cursor-pointer hover:border-orange-500 transition-all"
                                onClick={() =>
                                  onSetSelectedFactoryImage(
                                    image,
                                  )
                                }
                              >
                                <img
                                  src={image}
                                  alt={`반품/교환 ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              {/* 호버 시 크게 보기 */}
                              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100]">
                                <img
                                  src={image}
                                  alt={`반품/교환 ${index + 1} 미리보기`}
                                  className="w-96 h-96 object-contain rounded-lg shadow-2xl border-4 border-white bg-white"
                                />
                              </div>

                              {/* 삭제 버튼 */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveReturnImage(
                                    item.id,
                                    index,
                                    image,
                                  );
                                }}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}