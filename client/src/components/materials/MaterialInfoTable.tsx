import { ExternalLink } from 'lucide-react';
import { Material } from './types';
import { formatDate, CATEGORY_OPTIONS } from './utils';

interface MaterialInfoTableProps {
  material: Material;
  onMaterialChange: (material: Material) => void;
}

export function MaterialInfoTable({ material, onMaterialChange }: MaterialInfoTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div>
        <div className="mb-2">
          <span className="text-sm font-semibold text-gray-700">날짜: </span>
          <span className="text-sm text-gray-900">{formatDate(material.date)}</span>
        </div>
        <div className="border border-gray-300 rounded-lg overflow-x-auto">
          <table className="w-full" style={{ minWidth: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-sm font-semibold text-gray-700 border-r border-b border-gray-300 text-center whitespace-nowrap">코드</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700 border-r border-b border-gray-300 text-center whitespace-nowrap">카테고리</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700 border-r border-b border-gray-300 text-center whitespace-nowrap">상품명</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700 border-r border-b border-gray-300 text-center whitespace-nowrap">중문상품명</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700 border-r border-b border-gray-300 text-center whitespace-nowrap">종류 수</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700 border-r border-b border-gray-300 text-center whitespace-nowrap">단가</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700 border-r border-b border-gray-300 text-center whitespace-nowrap">구매완료</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700 border-b border-gray-300 text-center whitespace-nowrap">링크</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300 whitespace-nowrap">{material.code}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300 whitespace-nowrap">
                  <select
                    value={material.category}
                    onChange={(e) => {
                      onMaterialChange({ ...material, category: e.target.value });
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300 whitespace-nowrap">{material.productName}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300 whitespace-nowrap">{material.productNameChinese}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      value={material.typeCount}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        onMaterialChange({ ...material, typeCount: value });
                      }}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      min="0"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span>개</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1">
                    <span>¥</span>
                    <input
                      type="number"
                      value={material.price || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        onMaterialChange({ ...material, price: value });
                      }}
                      className="w-24 px-2 py-1 text-sm border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300 whitespace-nowrap">
                  <select
                    value={material.purchaseComplete ? 'completed' : 'incomplete'}
                    onChange={(e) => {
                      onMaterialChange({ ...material, purchaseComplete: e.target.value === 'completed' });
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="incomplete">미완료</option>
                    <option value="completed">구매완료</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-2">
                    <input
                      type="text"
                      value={material.link || ''}
                      onChange={(e) => {
                        onMaterialChange({ ...material, link: e.target.value });
                      }}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="링크를 입력하세요"
                      onClick={(e) => e.stopPropagation()}
                    />
                    {material.link && (
                      <a
                        href={material.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

