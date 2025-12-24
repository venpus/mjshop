import { Plus, Trash2, Truck, X } from "lucide-react";

export interface PackageInfo {
  id: string;
  types: string;
  pieces: string;
  sets: string;
  total: string;
  method: "박스" | "마대";
  weight: string;
}

export interface LogisticsInfo {
  id: string;
  trackingNumber: string;
  company: string;
  imageUrls: string[];
}

export interface DeliverySet {
  id: string;
  packingCode: string;
  date: string;
  packageInfoList: PackageInfo[];
  logisticsInfoList: LogisticsInfo[];
}

interface LogisticsDeliveryTabProps {
  newPackingCode: string;
  newPackingDate: string;
  deliverySets: DeliverySet[];
  hoveredImage: string;
  onSetNewPackingCode: (value: string) => void;
  onSetNewPackingDate: (value: string) => void;
  onAddDeliverySet: () => void;
  onRemoveDeliverySet: (setId: string) => void;
  onAddPackageInfo: (setId: string) => void;
  onUpdatePackageInfo: (setId: string, pkgId: string, field: string, value: any) => void;
  onRemovePackageInfo: (setId: string, pkgId: string) => void;
  onAddLogisticsInfo: (setId: string) => void;
  onUpdateLogisticsInfo: (setId: string, logisticsId: string, field: string, value: any) => void;
  onRemoveLogisticsInfo: (setId: string, logisticsId: string) => void;
  onHandleLogisticsImageUpload: (setId: string, logisticsId: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogisticsImage: (setId: string, logisticsId: string, imageIndex: number) => void;
  onSetSelectedImage: (image: string) => void;
  onSetHoveredImage: (image: string) => void;
}

export function LogisticsDeliveryTab({
  newPackingCode,
  newPackingDate,
  deliverySets,
  hoveredImage,
  onSetNewPackingCode,
  onSetNewPackingDate,
  onAddDeliverySet,
  onRemoveDeliverySet,
  onAddPackageInfo,
  onUpdatePackageInfo,
  onRemovePackageInfo,
  onAddLogisticsInfo,
  onUpdateLogisticsInfo,
  onRemoveLogisticsInfo,
  onHandleLogisticsImageUpload,
  onRemoveLogisticsImage,
  onSetSelectedImage,
  onSetHoveredImage,
}: LogisticsDeliveryTabProps) {
  return (
    <div className="space-y-6">
      {/* 포장 코드 및 날짜 입력 */}
      <div className="bg-orange-50 p-5 rounded-lg border border-orange-200">
        <div className="grid grid-cols-12 gap-6 items-end">
          <div className="col-span-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              포장 코드
            </label>
            <input
              type="text"
              value={newPackingCode}
              onChange={(e) => onSetNewPackingCode(e.target.value)}
              placeholder="포장 코드를 입력하세요"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="col-span-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              날짜
            </label>
            <input
              type="date"
              value={newPackingDate}
              onChange={(e) => onSetNewPackingDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="col-span-2">
            <button
              onClick={onAddDeliverySet}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              추가
            </button>
          </div>
        </div>
      </div>

      {/* 배송 세트 목록 */}
      <div className="space-y-6">
        {deliverySets.map((set) => (
          <div key={set.id} className="bg-white border-2 border-orange-200 rounded-lg p-5">
            {/* 헤더: 포장 코드와 날짜 */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-orange-200">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">포장 코드:</span>
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded font-semibold">
                    {set.packingCode}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">날짜:</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded">
                    {set.date}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onRemoveDeliverySet(set.id)}
                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* 포장 정보 영역 */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800">포장 정보</h4>
                <button
                  onClick={() => onAddPackageInfo(set.id)}
                  className="flex items-center gap-1 px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-xs"
                >
                  <Plus className="w-3 h-3" />
                  추가
                </button>
              </div>
              
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-2 py-1.5 text-left">종</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center">×</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left">개</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center">×</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left">세트</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center">=</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left">합계</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left">포장방식</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left">중량(kg)</th>
                    <th className="border border-gray-300 px-2 py-1.5 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {set.packageInfoList.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-0">
                        <input
                          type="text"
                          value={pkg.types}
                          onChange={(e) => onUpdatePackageInfo(set.id, pkg.id, "types", e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-center text-gray-500">×</td>
                      <td className="border border-gray-300 p-0">
                        <input
                          type="text"
                          value={pkg.pieces}
                          onChange={(e) => onUpdatePackageInfo(set.id, pkg.id, "pieces", e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-center text-gray-500">×</td>
                      <td className="border border-gray-300 p-0">
                        <input
                          type="text"
                          value={pkg.sets}
                          onChange={(e) => onUpdatePackageInfo(set.id, pkg.id, "sets", e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-center text-gray-500">=</td>
                      <td className="border border-gray-300 p-0">
                        <input
                          type="text"
                          value={pkg.total}
                          readOnly
                          placeholder="0"
                          className="w-full px-2 py-1 border-0 bg-gray-50 text-gray-700 cursor-default"
                        />
                      </td>
                      <td className="border border-gray-300 p-0">
                        <select
                          value={pkg.method}
                          onChange={(e) => onUpdatePackageInfo(set.id, pkg.id, "method", e.target.value as "박스" | "마대")}
                          className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          <option value="박스">박스</option>
                          <option value="마대">마대</option>
                        </select>
                      </td>
                      <td className="border border-gray-300 p-0">
                        <input
                          type="text"
                          value={pkg.weight}
                          onChange={(e) => onUpdatePackageInfo(set.id, pkg.id, "weight", e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-center">
                        <button
                          onClick={() => onRemovePackageInfo(set.id, pkg.id)}
                          disabled={set.packageInfoList.length === 1}
                          className={`p-0.5 rounded transition-colors ${
                            set.packageInfoList.length === 1
                              ? "text-gray-300 cursor-not-allowed"
                              : "text-red-600 hover:bg-red-100"
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 물류 정보 영역 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800">물류 정보</h4>
                <button
                  onClick={() => onAddLogisticsInfo(set.id)}
                  className="flex items-center gap-1 px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-xs"
                >
                  <Plus className="w-3 h-3" />
                  추가
                </button>
              </div>
              
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-2 py-1.5 text-left">송장번호</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left">물류회사</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left">사진</th>
                    <th className="border border-gray-300 px-2 py-1.5 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {set.logisticsInfoList.map((logistics) => (
                    <tr key={logistics.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-0">
                        <input
                          type="text"
                          value={logistics.trackingNumber}
                          onChange={(e) => onUpdateLogisticsInfo(set.id, logistics.id, "trackingNumber", e.target.value)}
                          placeholder="송장번호를 입력하세요"
                          className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </td>
                      <td className="border border-gray-300 p-0">
                        <input
                          type="text"
                          value={logistics.company}
                          onChange={(e) => onUpdateLogisticsInfo(set.id, logistics.id, "company", e.target.value)}
                          placeholder="물류회사명"
                          className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </td>
                      <td className="border border-gray-300 p-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          {/* 썸네일 목록 */}
                          {logistics.imageUrls.map((imageUrl, imgIdx) => (
                            <div 
                              key={imgIdx} 
                              className="relative group"
                              onMouseEnter={() => onSetHoveredImage(imageUrl)}
                              onMouseLeave={() => onSetHoveredImage("")}
                            >
                              <img
                                src={imageUrl}
                                alt={`물류 ${imgIdx + 1}`}
                                className="w-10 h-10 object-cover rounded border border-gray-300 cursor-pointer hover:border-orange-500 transition-all"
                                onClick={() => onSetSelectedImage(imageUrl)}
                              />
                              
                              {/* 호버 시 크게 보기 */}
                              {hoveredImage === imageUrl && (
                                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none">
                                  <img
                                    src={imageUrl}
                                    alt={`물류 ${imgIdx + 1} 미리보기`}
                                    className="w-96 h-96 object-contain rounded-lg shadow-2xl border-4 border-white bg-white"
                                  />
                                </div>
                              )}
                              
                              {/* 삭제 버튼 */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveLogisticsImage(set.id, logistics.id, imgIdx);
                                }}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          
                          {/* 이미지 업로드 버튼 */}
                          <label className="w-10 h-10 flex items-center justify-center border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-all">
                            <Plus className="w-4 h-4 text-gray-400" />
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(e) => onHandleLogisticsImageUpload(set.id, logistics.id, e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-center">
                        <button
                          onClick={() => onRemoveLogisticsInfo(set.id, logistics.id)}
                          disabled={set.logisticsInfoList.length === 1}
                          className={`p-0.5 rounded transition-colors ${
                            set.logisticsInfoList.length === 1
                              ? "text-gray-300 cursor-not-allowed"
                              : "text-red-600 hover:bg-red-100"
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* 배송 세트가 없을 때 안내 메시지 */}
      {deliverySets.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Truck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500">
            포장 코드와 날짜를 입력하고 추가 버튼을 눌러주세요.
          </p>
        </div>
      )}
    </div>
  );
}