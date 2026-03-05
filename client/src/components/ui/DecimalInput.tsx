import { useState, useRef, useEffect } from "react";
import { handleNumberInput, formatNumberForInput } from "../../utils/numberInputUtils";

function roundToDecimals(num: number, decimals: number): number {
  if (Number.isNaN(num) || !Number.isFinite(num)) return 0;
  const p = 10 ** decimals;
  return Math.round(num * p) / p;
}

/** 파싱 후 다시 포맷하면 원래 문자열이 사라지는 경우(예: "0.0" → 0 → "0")를 미완성으로 간주 */
function isIncompleteDecimal(str: string): boolean {
  if (str === "" || !str.includes(".")) return false;
  if (str.endsWith(".")) return true;
  const parsed = parseFloat(str) || 0;
  return formatNumberForInput(parsed) !== str;
}

export interface DecimalInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number;
  onChange: (value: number) => void;
  /** 소수점 자릿수 (외부 값 변경 감지·비교용). 기본 2 */
  decimalPlaces?: number;
}

/**
 * 소수 입력 시 "0." 등 미완성 입력이 그대로 보이도록 하는 금액/소수 입력 필드.
 * value는 숫자, 표시는 문자열로 관리하며 끝이 "."인 경우 부모에 반영하지 않고 표시만 유지.
 */
export function DecimalInput({
  value,
  onChange,
  decimalPlaces = 2,
  step = "0.01",
  ...rest
}: DecimalInputProps) {
  const [displayStr, setDisplayStr] = useState("");
  const lastEmittedRef = useRef<number | undefined>(undefined);

  // 외부에서 value가 바뀐 경우(다른 발주 로드 등) 편집 중 문자열 비우고 부모 값 표시
  useEffect(() => {
    const rounded = roundToDecimals(value, decimalPlaces);
    if (lastEmittedRef.current === undefined) {
      lastEmittedRef.current = value;
      return;
    }
    if (roundToDecimals(lastEmittedRef.current, decimalPlaces) !== rounded) {
      setDisplayStr("");
      lastEmittedRef.current = value;
    }
  }, [value, decimalPlaces]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const processed = handleNumberInput(raw);
    if (processed !== raw) {
      e.target.value = processed;
    }
    if (processed === "") {
      onChange(0);
      lastEmittedRef.current = 0;
      setDisplayStr("");
      return;
    }
    if (isIncompleteDecimal(processed)) {
      setDisplayStr(processed);
      return;
    }
    const num = parseFloat(processed) || 0;
    onChange(num);
    lastEmittedRef.current = num;
    setDisplayStr("");
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (displayStr !== "") {
      const num = parseFloat(displayStr) || 0;
      onChange(num);
      lastEmittedRef.current = num;
      setDisplayStr("");
    }
    rest.onBlur?.(e);
  };

  const displayValue = displayStr !== "" ? displayStr : formatNumberForInput(value);

  return (
    <input
      type="number"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      step={step}
      {...rest}
    />
  );
}
