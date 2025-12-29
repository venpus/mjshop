import { Download, ImageIcon, ThumbsUp, ThumbsDown, CheckCircle2, ShoppingCart } from 'lucide-react';
import { Material, TestImageReaction, TestImageConfirmation } from './types';
import { getImageExtension, handleDownload } from './utils';

interface TestImageItemProps {
  material: Material;
  imageUrl: string;
  index: number;
  reaction: TestImageReaction;
  memoInput: string;
  confirmation: TestImageConfirmation | null;
  currentManagerName: string;
  onImageClick: (imageUrl: string) => void;
  onReactionChange: (index: number, reaction: TestImageReaction) => void;
  onMemoInputChange: (index: number, value: string) => void;
  onConfirmationToggle: (index: number, isConfirmed: boolean) => void;
  onOrderClick: (index: number) => void;
}

export function TestImageItem({
  material,
  imageUrl,
  index,
  reaction,
  memoInput,
  confirmation,
  currentManagerName,
  onImageClick,
  onReactionChange,
  onMemoInputChange,
  onConfirmationToggle,
  onOrderClick,
}: TestImageItemProps) {
  const isConfirmed = confirmation !== null && confirmation !== undefined;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative aspect-square bg-white rounded-lg overflow-hidden flex items-center justify-center border-2 border-gray-200 hover:border-green-300 transition-colors cursor-pointer group shadow-sm"
        onClick={() => onImageClick(imageUrl)}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={`${material.productName} 테스트 사진 ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {/* 좋아요/싫어요 버튼 */}
            <div className="absolute top-2 left-2 flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReactionChange(index, reaction === 'like' ? null : 'like');
                }}
                className={`p-1.5 rounded-md shadow-md transition-all ${
                  reaction === 'like'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-blue-50'
                }`}
                title="좋아요"
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReactionChange(index, reaction === 'dislike' ? null : 'dislike');
                }}
                className={`p-1.5 rounded-md shadow-md transition-all ${
                  reaction === 'dislike'
                    ? 'bg-red-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-red-50'
                }`}
                title="싫어요"
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const ext = getImageExtension(imageUrl);
                handleDownload(imageUrl, `${material.productName}_테스트사진_${index + 1}.${ext}`);
              }}
              className="absolute top-2 right-2 p-2 bg-white rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-50"
              title="다운로드"
            >
              <Download className="w-4 h-4 text-green-600" />
            </button>
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
              #{index + 1}
            </div>
          </>
        ) : (
          <ImageIcon className="w-12 h-12 text-gray-400" />
        )}
      </div>
      {/* 메모 입력창 */}
      <div className="flex flex-col gap-1">
        <textarea
          value={memoInput}
          onChange={(e) => {
            onMemoInputChange(index, e.target.value);
          }}
          placeholder="의견을 입력하세요..."
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          rows={2}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConfirmationToggle(index, isConfirmed);
          }}
          className={`flex items-center justify-center gap-1 px-3 py-1 text-sm rounded-md transition-colors ${
            isConfirmed
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <CheckCircle2 className={`w-4 h-4 ${isConfirmed ? 'text-white' : 'text-gray-600'}`} />
          <span>{isConfirmed ? '확인 완료' : '확인'}</span>
        </button>
        {isConfirmed && confirmation && (
          <div className="px-2 py-1 text-xs text-green-700 bg-green-50 rounded border border-green-200">
            {/* TODO: DB 연동 시 확인 시간도 표시할 수 있도록 포맷팅 필요 */}
            {confirmation.confirmedBy}님이 확인했습니다.
          </div>
        )}
      </div>
      {/* 발주에 추가하기 버튼 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOrderClick(index);
        }}
        className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors w-full"
      >
        <ShoppingCart className="w-4 h-4" />
        <span>발주에 추가하기</span>
      </button>
    </div>
  );
}

