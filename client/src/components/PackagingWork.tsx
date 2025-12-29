import { useState } from 'react';
import { Hammer, Plus } from 'lucide-react';
import { PackagingWorkList } from './packaging-work/PackagingWorkList';
import { PackagingMaterial } from './packaging-work/types';
import { AddPackagingMaterialModal } from './packaging-work/AddPackagingMaterialModal';

// Dummy 데이터
const dummyPackagingMaterials: PackagingMaterial[] = [
  {
    id: 1,
    code: 'PKG001',
    name: '포장 박스',
    nameChinese: '包装盒',
    price: 1250.5,
    stock: 100,
    images: [
      'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=100',
      'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=100',
    ],
  },
  {
    id: 2,
    code: 'PKG002',
    name: '테이프',
    nameChinese: '胶带',
    price: 850.75,
    stock: 250,
    images: [
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=100',
    ],
  },
];

export function PackagingWork() {
  const [materials, setMaterials] = useState<PackagingMaterial[]>(dummyPackagingMaterials);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAdd = (materialData: Omit<PackagingMaterial, 'id'>) => {
    // TODO: DB 연동 시 서버에 포장자재 추가 요청
    // POST /api/packaging-materials
    // const response = await fetch('/api/packaging-materials', { ... });
    
    // 임시로 새 ID 생성 (실제로는 서버에서 받아옴)
    const newId = materials.length > 0 ? Math.max(...materials.map(m => m.id)) + 1 : 1;
    
    const newMaterial: PackagingMaterial = {
      id: newId,
      ...materialData,
    };
    
    setMaterials([...materials, newMaterial]);
    setIsAddModalOpen(false);
  };

  const handleDelete = (material: PackagingMaterial) => {
    console.log('삭제:', material);
    // TODO: 삭제 기능 구현
    if (confirm(`${material.name}을(를) 삭제하시겠습니까?`)) {
      alert(`삭제: ${material.name}`);
    }
  };

  return (
    <div className="p-8">
      <div className="w-full">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-md">
                  <Hammer className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-gray-900">포장 작업 관리</h2>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                포장 작업 현황 및 관리를 수행합니다.
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>포장자재 추가</span>
            </button>
          </div>
        </div>

        <PackagingWorkList 
          materials={materials} 
          onDelete={handleDelete}
        />

        {/* 포장자재 추가 모달 */}
        <AddPackagingMaterialModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAdd}
        />
      </div>
    </div>
  );
}

