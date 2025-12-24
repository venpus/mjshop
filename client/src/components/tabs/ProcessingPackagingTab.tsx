import { Wrench, Plus, Trash2, Image } from "lucide-react";

export interface WorkItem {
  id: string;
  image: string;
  descriptionKo: string;
  descriptionZh: string;
  isCompleted?: boolean;
}

interface ProcessingPackagingTabProps {
  workItems: WorkItem[];
  workStatus: string;
  workStartDate: string;
  workEndDate: string;
  onSetWorkStartDate: (date: string) => void;
  onSetWorkEndDate: (date: string) => void;
  onHandleWorkImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onHandleWorkItemComplete: (id: string, checked: boolean) => void;
  onRemoveWorkItem: (id: string) => void;
  onUpdateWorkItemDescription: (id: string, field: "descriptionKo" | "descriptionZh", value: string) => void;
  onSetSelectedFactoryImage: (image: string) => void;
}

export function ProcessingPackagingTab({
  workItems,
  workStatus,
  workStartDate,
  workEndDate,
  onSetWorkStartDate,
  onSetWorkEndDate,
  onHandleWorkImageUpload,
  onHandleWorkItemComplete,
  onRemoveWorkItem,
  onUpdateWorkItemDescription,
  onSetSelectedFactoryImage,
}: ProcessingPackagingTabProps) {
  return (
    <div className="space-y-4">
      {/* Work Status & Add Button */}
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              가공/포장 작업
            </h3>
            {/* 작업 항목 개수 배지 */}
            {workItems.length > 0 && (
              <span className="inline-flex items-center justify-center px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-sm font-bold shadow-md">
                {workItems.length}개
              </span>
            )}
          </div>

          {/* 작업 상태 배지 */}
          <span
            className={`inline-flex px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${
              workStatus === "완료"
                ? "bg-green-500 text-white"
                : workStatus === "작업중"
                  ? "bg-blue-500 text-white"
                  : "bg-yellow-500 text-white"
            }`}
          >
            {workStatus}
          </span>

          {/* 작업 일정 */}
          <div className="flex items-center gap-2 text-sm">
            {/* 작업시작일 */}
            <div className="flex items-center gap-1">
              <label className="text-gray-600">
                시작일:
              </label>
              <input
                type="date"
                value={workStartDate}
                onChange={(e) =>
                  onSetWorkStartDate(e.target.value)
                }
                className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 작업완료일 */}
            <div className="flex items-center gap-1">
              <label className="text-gray-600">
                완료일:
              </label>
              <input
                type="date"
                value={workEndDate}
                onChange={(e) =>
                  onSetWorkEndDate(e.target.value)
                }
                min={workStartDate}
                className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* 사진 추가 버튼 */}
        <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer transition-colors">
          <Plus className="w-4 h-4" />
          <span>작업 항목 추가</span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={onHandleWorkImageUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* 작업 항목 목록 */}
      {workItems.length === 0 ? (
        <div className="bg-purple-50 rounded-lg p-6 text-center">
          <Image className="w-10 h-10 text-purple-300 mx-auto mb-2" />
          <p className="text-gray-600 text-sm">
            작업 항목이 없습니다. 위의 "작업 항목
            추가" 버튼을 눌러 추가해주세요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3">
          {workItems.map((item, index) => (
            <div
              key={item.id}
              className="bg-purple-50 rounded-lg p-4"
            >
              {/* 항목 번호, 완료 체크박스, 삭제 버튼 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-purple-700">
                    작업 #{index + 1}
                  </span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        item.isCompleted || false
                      }
                      onChange={(e) =>
                        onHandleWorkItemComplete(
                          item.id,
                          e.target.checked,
                        )
                      }
                      className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                    />
                    <span className="text-xs text-gray-600">
                      완료
                    </span>
                  </label>
                </div>
                <button
                  onClick={() =>
                    onRemoveWorkItem(item.id)
                  }
                  className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-xs"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>삭제</span>
                </button>
              </div>

              <div className="space-y-3">
                {/* 썸네일 이미지 */}
                <div className="relative group mx-auto w-1/2">
                  <div
                    className="w-full aspect-square rounded-lg border-2 border-purple-300 overflow-hidden cursor-pointer hover:border-purple-500 transition-all"
                    onClick={() =>
                      onSetSelectedFactoryImage(
                        item.image,
                      )
                    }
                  >
                    <img
                      src={item.image}
                      alt={`작업 사진 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* 호버 시 크게 보기 */}
                  <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100]">
                    <img
                      src={item.image}
                      alt={`작업 사진 ${index + 1} 미리보기`}
                      className="w-80 h-80 object-contain rounded-lg shadow-2xl border-4 border-white bg-white"
                    />
                  </div>
                </div>

                {/* 설명 입력 영역 */}
                <div className="space-y-2">
                  {/* 한국어 설명 */}
                  <div>
                    <label className="text-xs text-gray-700 mb-1 block font-medium">
                      작업 설명 (한국어)
                    </label>
                    <textarea
                      value={item.descriptionKo}
                      onChange={(e) =>
                        onUpdateWorkItemDescription(
                          item.id,
                          "descriptionKo",
                          e.target.value,
                        )
                      }
                      placeholder="작업 설명을 입력하세요..."
                      rows={2}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  {/* 중국어 설명 */}
                  <div>
                    <label className="text-xs text-gray-700 mb-1 block font-medium">
                      作业说明 (中文)
                    </label>
                    <textarea
                      value={item.descriptionZh}
                      onChange={(e) =>
                        onUpdateWorkItemDescription(
                          item.id,
                          "descriptionZh",
                          e.target.value,
                        )
                      }
                      placeholder="请输入作业说明..."
                      rows={2}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
