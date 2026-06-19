import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Wrench,
  X,
} from 'lucide-react';
import { useDraggableFloatingPosition } from '../../hooks/useDraggableFloatingPosition';
import { CostCalculatorTool } from './CostCalculatorTool';
import {
  getEstimatedShopToolsPanelHeight,
  getShopToolsPanelOriginClass,
  getShopToolsPanelPlacementStyle,
  resolveShopToolsExpandDirection,
  SHOP_TOOLS_PANEL_MAX_WIDTH,
  type ShopToolsExpandDirection,
} from './shopToolsExpandDirection';

const FLOAT_POS_STORAGE_KEY = 'mjshop_shop_tools_float_pos';
const FAB_CLAMP_SIZE = { width: 52, height: 52 };

type ShopToolId = 'cost-calculator';

interface ShopToolItem {
  id: ShopToolId;
  label: string;
  description: string;
  icon: typeof Calculator;
}

const SHOP_TOOLS: ShopToolItem[] = [
  {
    id: 'cost-calculator',
    label: '원가 계산기',
    description: '위안 원가·환율 기준 원가 계산',
    icon: Calculator,
  },
];

interface ShopToolsPanelProps {
  activeTool: ShopToolId | null;
  onClose: () => void;
  onSelectTool: (toolId: ShopToolId) => void;
  onBackFromTool: () => void;
}

function ShopToolsPanel({
  activeTool,
  onClose,
  onSelectTool,
  onBackFromTool,
}: ShopToolsPanelProps) {
  if (activeTool === 'cost-calculator') {
    return <CostCalculatorTool onBack={onBackFromTool} />;
  }

  return (
    <div className="p-2">
      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
        <span className="text-xs font-semibold text-gray-700">쇼핑몰 도구</span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="닫기"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <ul className="space-y-1">
        {SHOP_TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <li key={tool.id}>
              <button
                type="button"
                onClick={() => onSelectTool(tool.id)}
                className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-purple-50 transition-colors group"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 group-hover:bg-purple-200">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className="block text-sm font-medium text-gray-900">{tool.label}</span>
                  <span className="block text-xs text-gray-500 mt-0.5">{tool.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ExpandDirectionIcon({ direction }: { direction: ShopToolsExpandDirection }) {
  switch (direction) {
    case 'up':
      return <ChevronDown className="w-5 h-5" aria-hidden />;
    case 'down':
      return <ChevronUp className="w-5 h-5" aria-hidden />;
    case 'left':
      return <ChevronRight className="w-5 h-5" aria-hidden />;
    case 'right':
      return <ChevronLeft className="w-5 h-5" aria-hidden />;
  }
}

export function ShopManagementToolsFloating() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useDraggableFloatingPosition(FLOAT_POS_STORAGE_KEY, {
    clampSize: FAB_CLAMP_SIZE,
    positionElementRef: wrapperRef,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ShopToolId | null>(null);
  const [expandDirection, setExpandDirection] = useState<ShopToolsExpandDirection>('up');

  const updateExpandDirection = useCallback(() => {
    const fab = drag.ref.current;
    if (!fab) return;

    const fabRect = fab.getBoundingClientRect();
    const panelEl = panelRef.current;
    const panelWidth = panelEl?.offsetWidth ?? SHOP_TOOLS_PANEL_MAX_WIDTH;
    const panelHeight =
      panelEl?.offsetHeight ?? getEstimatedShopToolsPanelHeight(activeTool);

    setExpandDirection(
      resolveShopToolsExpandDirection(fabRect, panelWidth, panelHeight)
    );
  }, [activeTool, drag.ref]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateExpandDirection();
  }, [isOpen, activeTool, drag.pos, updateExpandDirection]);

  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => updateExpandDirection();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isOpen, updateExpandDirection]);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setActiveTool(null);
  }, []);

  const handleFabClick = () => {
    if (drag.consumeClickIfDrag()) {
      return;
    }
    if (isOpen) {
      closePanel();
      return;
    }
    setExpandDirection('up');
    setIsOpen(true);
  };

  return (
    <>
      {isOpen ? (
        <div className="fixed inset-0 z-[38]" aria-hidden onClick={closePanel} />
      ) : null}

      <div
        ref={wrapperRef}
        style={drag.positionStyle}
        className={`fixed z-[40] ${drag.positionClass}`}
      >
        <div className="relative h-[3.25rem] w-[3.25rem]">
          {isOpen ? (
            <div
              ref={panelRef}
              style={getShopToolsPanelPlacementStyle(expandDirection)}
              className={`absolute z-10 w-[min(calc(100vw-2rem),20rem)] rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-900/10 overflow-hidden transition-all duration-200 ease-out ${getShopToolsPanelOriginClass(expandDirection)} scale-100 opacity-100`}
            >
              <ShopToolsPanel
                activeTool={activeTool}
                onClose={closePanel}
                onSelectTool={setActiveTool}
                onBackFromTool={() => setActiveTool(null)}
              />
            </div>
          ) : null}

          <button
            type="button"
            ref={drag.ref as React.RefObject<HTMLButtonElement>}
            onClick={handleFabClick}
            onPointerDown={drag.onPointerDown}
            aria-expanded={isOpen}
            aria-label={isOpen ? '쇼핑몰 도구 닫기' : '쇼핑몰 도구 열기'}
            title="클릭: 도구 열기 · 길게 눌러 끌기: 위치 이동"
            className={`relative z-20 flex h-[3.25rem] w-[3.25rem] shrink-0 select-none touch-none items-center justify-center rounded-full border shadow-lg transition-colors cursor-pointer ${
              isOpen
                ? 'border-purple-300 bg-purple-600 text-white shadow-purple-900/20 hover:bg-purple-700'
                : 'border-purple-200 bg-white text-purple-700 shadow-purple-900/10 hover:bg-purple-50'
            }`}
          >
            {isOpen ? (
              <ExpandDirectionIcon direction={expandDirection} />
            ) : (
              <Wrench className="w-5 h-5" aria-hidden />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
