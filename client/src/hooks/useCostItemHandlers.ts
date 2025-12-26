import { useCallback, useMemo } from "react";
import type { LaborCostItem } from "../components/tabs/CostPaymentTab";

interface UseCostItemHandlersProps {
  optionItems: LaborCostItem[];
  setOptionItems: React.Dispatch<React.SetStateAction<LaborCostItem[]>>;
  laborCostItems: LaborCostItem[];
  setLaborCostItems: React.Dispatch<React.SetStateAction<LaborCostItem[]>>;
  commissionType: string;
  setCommissionType: (value: string) => void;
  setCommissionRate: (value: number) => void;
}

interface UseCostItemHandlersReturn {
  commissionOptions: Array<{ label: string; rate: number }>;
  handleCommissionTypeChange: (value: string) => void;
  addLaborCostItem: () => void;
  removeLaborCostItem: (id: string) => void;
  updateLaborCostItemName: (id: string, name: string) => void;
  updateLaborCostItemCost: (id: string, cost: number) => void;
  addOptionItem: () => void;
  removeOptionItem: (id: string) => void;
  updateOptionItemName: (id: string, name: string) => void;
  updateOptionItemCost: (id: string, cost: number) => void;
}

/**
 * Cost Items 핸들러 Hook
 */
export function useCostItemHandlers({
  optionItems,
  setOptionItems,
  laborCostItems,
  setLaborCostItems,
  commissionType,
  setCommissionType,
  setCommissionRate,
}: UseCostItemHandlersProps): UseCostItemHandlersReturn {
  // 수수료 타입 옵션
  const commissionOptions = useMemo(
    () => [
      { label: "5만위안 이상 재주문 5%", rate: 5 },
      { label: "5만위안 이하 재주문 7%", rate: 7 },
      { label: "5만위안 이상 신규주문 8%", rate: 8 },
      { label: "5만위안이하 신규주문 10%", rate: 10 },
    ],
    [],
  );

  // 수수료 타입 변경 핸들러
  const handleCommissionTypeChange = useCallback(
    (value: string) => {
      setCommissionType(value);
      const selected = commissionOptions.find((opt) => opt.label === value);
      if (selected) {
        setCommissionRate(selected.rate);
      }
    },
    [commissionOptions, setCommissionType, setCommissionRate],
  );

  // 인건비 항목 추가
  const addLaborCostItem = useCallback(() => {
    const newItem: LaborCostItem = {
      id: Date.now().toString(),
      name: "",
      cost: 0,
    };
    setLaborCostItems([...laborCostItems, newItem]);
  }, [laborCostItems, setLaborCostItems]);

  // 인건비 항목 삭제
  const removeLaborCostItem = useCallback(
    (id: string) => {
      setLaborCostItems(
        laborCostItems.filter((item) => item.id !== id),
      );
    },
    [laborCostItems, setLaborCostItems],
  );

  // 인건비 항목명 수정
  const updateLaborCostItemName = useCallback(
    (id: string, name: string) => {
      setLaborCostItems(
        laborCostItems.map((item) =>
          item.id === id ? { ...item, name } : item,
        ),
      );
    },
    [laborCostItems, setLaborCostItems],
  );

  // 인건비 비용 수정
  const updateLaborCostItemCost = useCallback(
    (id: string, cost: number) => {
      setLaborCostItems(
        laborCostItems.map((item) =>
          item.id === id ? { ...item, cost } : item,
        ),
      );
    },
    [laborCostItems, setLaborCostItems],
  );

  // 옵션 항목 추가
  const addOptionItem = useCallback(() => {
    const newItem: LaborCostItem = {
      id: Date.now().toString(),
      name: "",
      cost: 0,
    };
    setOptionItems([...optionItems, newItem]);
  }, [optionItems, setOptionItems]);

  // 옵션 항목 삭제
  const removeOptionItem = useCallback(
    (id: string) => {
      setOptionItems(optionItems.filter((item) => item.id !== id));
    },
    [optionItems, setOptionItems],
  );

  // 옵션 항목명 수정
  const updateOptionItemName = useCallback(
    (id: string, name: string) => {
      setOptionItems(
        optionItems.map((item) => (item.id === id ? { ...item, name } : item)),
      );
    },
    [optionItems, setOptionItems],
  );

  // 옵션 비용 수정
  const updateOptionItemCost = useCallback(
    (id: string, cost: number) => {
      setOptionItems(
        optionItems.map((item) => (item.id === id ? { ...item, cost } : item)),
      );
    },
    [optionItems, setOptionItems],
  );

  return {
    commissionOptions,
    handleCommissionTypeChange,
    addLaborCostItem,
    removeLaborCostItem,
    updateLaborCostItemName,
    updateLaborCostItemCost,
    addOptionItem,
    removeOptionItem,
    updateOptionItemName,
    updateOptionItemCost,
  };
}

