import { Upload } from 'lucide-react';
import { Material, TestImageReaction, TestImageConfirmation } from './types';
import { TestImageItem } from './TestImageItem';

interface TestImagesSectionProps {
  material: Material;
  testImageReactions: Record<number, TestImageReaction>;
  testImageMemoInputs: Record<number, string>;
  testImageMemoConfirmations: Record<number, TestImageConfirmation | null>;
  currentManagerName: string;
  onImageClick: (imageUrl: string) => void;
  onUploadClick: () => void;
  onReactionChange: (index: number, reaction: TestImageReaction) => void;
  onMemoInputChange: (index: number, value: string) => void;
  onConfirmationToggle: (index: number, isConfirmed: boolean) => void;
  onOrderClick: (index: number) => void;
}

export function TestImagesSection({
  material,
  testImageReactions,
  testImageMemoInputs,
  testImageMemoConfirmations,
  currentManagerName,
  onImageClick,
  onUploadClick,
  onReactionChange,
  onMemoInputChange,
  onConfirmationToggle,
  onOrderClick,
}: TestImagesSectionProps) {
  if (material.testImages && material.testImages.length > 0) {
    return (
      <div className="bg-green-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700">테스트 사진 ({material.testImages.length}장)</h3>
          <button
            onClick={onUploadClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
          >
            <Upload className="w-4 h-4" />
            <span>사진 업로드</span>
          </button>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {material.testImages.map((imageUrl, index) => {
            const reaction = testImageReactions[index] || null;
            const memoInput = testImageMemoInputs[index] || '';
            const confirmation = testImageMemoConfirmations[index] || null;
            return (
              <TestImageItem
                key={index}
                material={material}
                imageUrl={imageUrl}
                index={index}
                reaction={reaction}
                memoInput={memoInput}
                confirmation={confirmation}
                currentManagerName={currentManagerName}
                onImageClick={onImageClick}
                onReactionChange={onReactionChange}
                onMemoInputChange={onMemoInputChange}
                onConfirmationToggle={onConfirmationToggle}
                onOrderClick={onOrderClick}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700">테스트 사진</h3>
        <button
          onClick={onUploadClick}
          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
        >
          <Upload className="w-4 h-4" />
          <span>사진 업로드</span>
        </button>
      </div>
      <div className="text-center py-8 text-gray-500 text-sm">
        업로드된 사진이 없습니다.
      </div>
    </div>
  );
}

