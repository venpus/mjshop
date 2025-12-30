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
  addLaborCostItem: (isAdminOnly?: boolean) => void;
  removeLaborCostItem: (id: string) => void;
  updateLaborCostItemName: (id: string, name: string) => void;
  updateLaborCostItemUnitPrice: (id: string, unitPrice: number) => void;
  updateLaborCostItemQuantity: (id: string, quantity: number) => void;
  addOptionItem: (isAdminOnly?: boolean) => void;
  removeOptionItem: (id: string) => void;
  updateOptionItemName: (id: string, name: string) => void;
  updateOptionItemUnitPrice: (id: string, unitPrice: number) => void;
  updateOptionItemQuantity: (id: string, quantity: number) => void;
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
  const addLaborCostItem = useCallback((isAdminOnly: boolean = false) => {
    const newItem: LaborCostItem = {
      id: Date.now().toString(),
      name: "",
      unit_price: 0,
      quantity: 1,
      cost: 0, // unit_price * quantity로 계산
      isAdminOnly: isAdminOnly,
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

  // 인건비 단가 수정
  const updateLaborCostItemUnitPrice = useCallback(
    (id: string, unitPrice: number) => {
      setLaborCostItems(
        laborCostItems.map((item) => {
          if (item.id === id) {
            const newCost = unitPrice * item.quantity;
            return { ...item, unit_price: unitPrice, cost: newCost };
          }
          return item;
        }),
      );
    },
    [laborCostItems, setLaborCostItems],
  );

  // 인건비 수량 수정
  const updateLaborCostItemQuantity = useCallback(
    (id: string, quantity: number) => {
      setLaborCostItems(
        laborCostItems.map((item) => {
          if (item.id === id) {
            const newCost = item.unit_price * quantity;
            return { ...item, quantity, cost: newCost };
          }
          return item;
        }),
      );
    },
    [laborCostItems, setLaborCostItems],
  );

  // 옵션 항목 추가
  const addOptionItem = useCallback((isAdminOnly: boolean = false) => {
    const newItem: LaborCostItem = {
      id: Date.now().toString(),
      name: "",
      unit_price: 0,
      quantity: 1,
      cost: 0, // unit_price * quantity로 계산
      isAdminOnly: isAdminOnly,
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

  // 옵션 단가 수정
  const updateOptionItemUnitPrice = useCallback(
    (id: string, unitPrice: number) => {
      setOptionItems(
        optionItems.map((item) => {
          if (item.id === id) {
            const newCost = unitPrice * item.quantity;
            return { ...item, unit_price: unitPrice, cost: newCost };
          }
          return item;
        }),
      );
    },
    [optionItems, setOptionItems],
  );

  // 옵션 수량 수정
  const updateOptionItemQuantity = useCallback(
    (id: string, quantity: number) => {
      setOptionItems(
        optionItems.map((item) => {
          if (item.id === id) {
            const newCost = item.unit_price * quantity;
            return { ...item, quantity, cost: newCost };
          }
          return item;
        }),
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
    updateLaborCostItemUnitPrice,
    updateLaborCostItemQuantity,
    addOptionItem,
    removeOptionItem,
    updateOptionItemName,
    updateOptionItemUnitPrice,
    updateOptionItemQuantity,
  };
}

