import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown } from 'lucide-react';
import type { ShopBuyerListItem } from './types';
import { formatCompanyNameWithKakaoId } from '../../utils/shopBuyerDisplay';
import { cn } from '../ui/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '../ui/command';

const DROPDOWN_MIN_WIDTH = 280;
const DROPDOWN_MAX_HEIGHT = 240;
const DROPDOWN_GAP = 4;

function filterShopBuyers(buyers: ShopBuyerListItem[], query: string): ShopBuyerListItem[] {
  const sorted = [...buyers].sort((a, b) =>
    a.companyName.localeCompare(b.companyName, 'ko')
  );
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!q) return sorted;

  return sorted.filter((buyer) => {
    const label = formatCompanyNameWithKakaoId(buyer.companyName, buyer.kakaoId).toLowerCase();
    const kakao = (buyer.kakaoId ?? '').toLowerCase();
    const company = buyer.companyName.toLowerCase();
    return label.includes(q) || company.includes(q) || kakao.includes(q);
  });
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placeAbove: boolean;
}

function computeDropdownPosition(trigger: HTMLElement): DropdownPosition {
  const rect = trigger.getBoundingClientRect();
  const width = Math.max(rect.width, DROPDOWN_MIN_WIDTH);
  const viewportPadding = 8;
  const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
  const spaceAbove = rect.top - viewportPadding;
  const placeAbove = spaceBelow < 160 && spaceAbove > spaceBelow;
  const maxHeight = Math.min(
    DROPDOWN_MAX_HEIGHT,
    Math.max(120, placeAbove ? spaceAbove - DROPDOWN_GAP : spaceBelow - DROPDOWN_GAP)
  );

  let left = rect.left;
  if (left + width > window.innerWidth - viewportPadding) {
    left = Math.max(viewportPadding, window.innerWidth - viewportPadding - width);
  }

  const top = placeAbove
    ? rect.top - DROPDOWN_GAP
    : rect.bottom + DROPDOWN_GAP;

  return { top, left, width, maxHeight, placeAbove };
}

interface ShopBuyerCompanyPickerProps {
  buyers: ShopBuyerListItem[];
  selectedBuyer: ShopBuyerListItem | null;
  /** 구매자 목록에 없는 기존 상호명 */
  unmatchedCompanyName?: string;
  onSelect: (buyerId: string) => void;
  className?: string;
  disabled?: boolean;
}

export function ShopBuyerCompanyPicker({
  buyers,
  selectedBuyer,
  unmatchedCompanyName,
  onSelect,
  className,
  disabled = false,
}: ShopBuyerCompanyPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dropdownPos, setDropdownPos] = useState<DropdownPosition | null>(null);

  const displayLabel = useMemo(() => {
    if (selectedBuyer) {
      return formatCompanyNameWithKakaoId(selectedBuyer.companyName, selectedBuyer.kakaoId);
    }
    if (unmatchedCompanyName?.trim()) return unmatchedCompanyName.trim();
    return '';
  }, [selectedBuyer, unmatchedCompanyName]);

  const filteredBuyers = useMemo(() => filterShopBuyers(buyers, query), [buyers, query]);
  const hasUnmatched = Boolean(unmatchedCompanyName?.trim()) && !selectedBuyer;

  const updateDropdownPosition = useCallback(() => {
    if (!rootRef.current) return;
    setDropdownPos(computeDropdownPosition(rootRef.current));
  }, []);

  useEffect(() => {
    if (!open) return;

    updateDropdownPosition();
    const onScrollOrResize = () => updateDropdownPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    if (!open) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
      setQuery('');
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openPicker = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    requestAnimationFrame(() => {
      updateDropdownPosition();
      inputRef.current?.focus();
    });
  };

  const closePicker = () => {
    setOpen(false);
    setQuery('');
    setDropdownPos(null);
  };

  const handleSelect = (buyerId: string) => {
    onSelect(buyerId);
    closePicker();
  };

  const inputValue = open ? query : displayLabel;

  const dropdown =
    open &&
    dropdownPos &&
    createPortal(
      <div
        ref={dropdownRef}
        className="fixed z-[200] flex flex-col overflow-hidden rounded-md border border-gray-200 bg-white text-gray-900 shadow-lg"
        style={{
          left: dropdownPos.left,
          width: dropdownPos.width,
          maxHeight: dropdownPos.maxHeight,
          ...(dropdownPos.placeAbove
            ? { top: dropdownPos.top, transform: 'translateY(-100%)' }
            : { top: dropdownPos.top }),
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Command
          shouldFilter={false}
          className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
        >
          <CommandList
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
            style={{ maxHeight: dropdownPos.maxHeight }}
          >
            <CommandEmpty className="py-4 text-center text-xs text-gray-500">
              검색 결과가 없습니다.
            </CommandEmpty>
            <CommandGroup>
              {(selectedBuyer || displayLabel) && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => handleSelect('')}
                  className="text-xs text-gray-500"
                >
                  선택 해제
                </CommandItem>
              )}
              {filteredBuyers.map((buyer) => {
                const label = formatCompanyNameWithKakaoId(buyer.companyName, buyer.kakaoId);
                return (
                  <CommandItem
                    key={buyer.id}
                    value={String(buyer.id)}
                    onSelect={() => handleSelect(String(buyer.id))}
                    className="text-xs cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 w-3.5 h-3.5 shrink-0',
                        selectedBuyer?.id === buyer.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="truncate">{label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>,
      document.body
    );

  return (
    <div ref={rootRef} className="relative min-w-0 w-full">
      <div className="flex items-stretch min-w-0">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          disabled={disabled}
          placeholder="상호명 검색·선택"
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={openPicker}
          className={cn(
            className,
            'rounded-r-none border-r-0 pr-1',
            hasUnmatched && 'border-amber-400 bg-amber-50/50 focus:ring-amber-500'
          )}
        />
        <button
          type="button"
          disabled={disabled}
          aria-label="상호명 목록 열기"
          aria-expanded={open}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (open ? closePicker() : openPicker())}
          className={cn(
            'shrink-0 px-1 border border-gray-300 border-l-0 rounded-r-md',
            'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500',
            hasUnmatched && 'border-amber-400 bg-amber-50/50',
            disabled && 'opacity-40 cursor-not-allowed'
          )}
        >
          <ChevronsUpDown className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      {dropdown}
    </div>
  );
}
