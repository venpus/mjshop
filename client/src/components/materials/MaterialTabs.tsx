import { Material, TestImageReaction, TestImageConfirmation } from './types';
import { ProductImagesSection } from './ProductImagesSection';
import { TestImagesSection } from './TestImagesSection';
import { InventoryTab } from './InventoryTab';

interface MaterialTabsProps {
  activeTab: 'photos' | 'inventory';
  material: Material;
  testImageReactions: Record<number, TestImageReaction>;
  testImageMemoInputs: Record<number, string>;
  testImageMemoConfirmations: Record<number, TestImageConfirmation | null>;
  currentManagerName: string;
  onTabChange: (tab: 'photos' | 'inventory') => void;
  onImageClick: (imageUrl: string) => void;
  onProductImageUploadClick: () => void;
  onTestImageUploadClick: () => void;
  onReactionChange: (index: number, reaction: TestImageReaction) => void;
  onMemoInputChange: (index: number, value: string) => void;
  onConfirmationToggle: (index: number, isConfirmed: boolean) => void;
  onOrderClick: (index: number) => void;
  onInventoryAddClick: () => void;
  inventoryRecords?: any[];
  isLoadingInventory?: boolean;
  onInventorySave?: (transactionData: any) => Promise<void>;
}

export function MaterialTabs({
  activeTab,
  material,
  testImageReactions,
  testImageMemoInputs,
  testImageMemoConfirmations,
  currentManagerName,
  onTabChange,
  onImageClick,
  onProductImageUploadClick,
  onTestImageUploadClick,
  onReactionChange,
  onMemoInputChange,
  onConfirmationToggle,
  onOrderClick,
  onInventoryAddClick,
  inventoryRecords = [],
  isLoadingInventory = false,
  onInventorySave,
}: MaterialTabsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => onTabChange('photos')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'photos'
                ? 'border-purple-500 text-purple-600 bg-purple-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            사진
          </button>
          <button
            onClick={() => onTabChange('inventory')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'inventory'
                ? 'border-green-500 text-green-600 bg-green-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            입출고 기록
          </button>
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="p-6">
        {activeTab === 'photos' && (
          <div className="space-y-6">
            <ProductImagesSection
              material={material}
              onImageClick={onImageClick}
              onUploadClick={onProductImageUploadClick}
            />
            <TestImagesSection
              material={material}
              testImageReactions={testImageReactions}
              testImageMemoInputs={testImageMemoInputs}
              testImageMemoConfirmations={testImageMemoConfirmations}
              currentManagerName={currentManagerName}
              onImageClick={onImageClick}
              onUploadClick={onTestImageUploadClick}
              onReactionChange={onReactionChange}
              onMemoInputChange={onMemoInputChange}
              onConfirmationToggle={onConfirmationToggle}
              onOrderClick={onOrderClick}
            />
          </div>
        )}

        {activeTab === 'inventory' && (
          <InventoryTab
            onAddClick={onInventoryAddClick}
            inventoryRecords={inventoryRecords}
            isLoading={isLoadingInventory}
            onSave={onInventorySave}
            currentStock={material.currentStock}
          />
        )}
      </div>
    </div>
  );
}

