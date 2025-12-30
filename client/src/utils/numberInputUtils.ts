/**
 * 숫자 입력 필드에서 소수점 입력 시 "0.xx" 형태로 변환하는 유틸리티
 */

/**
 * 숫자 입력값을 처리하여 소수점 입력 시 "0.xx" 형태로 변환
 * @param value 입력값
 * @returns 처리된 입력값
 */
export function handleNumberInput(value: string): string {
  // 빈 문자열이면 그대로 반환
  if (value === '') {
    return '';
  }

  // "."로 시작하면 "0."으로 변환
  if (value === '.') {
    return '0.';
  }

  // "-."로 시작하면 "-0."으로 변환
  if (value === '-.') {
    return '-0.';
  }

  // ".xx" 형태면 "0.xx"로 변환
  if (value.startsWith('.') && !value.startsWith('0.')) {
    return '0' + value;
  }

  // "-.xx" 형태면 "-0.xx"로 변환
  if (value.startsWith('-.') && !value.startsWith('-0.')) {
    return '-0' + value.substring(1);
  }

  return value;
}

/**
 * 숫자 입력 필드의 onChange 핸들러를 생성
 * @param setter 상태 설정 함수
 * @returns onChange 핸들러
 */
export function createNumberInputHandler(
  setter: (value: number) => void
): (e: React.ChangeEvent<HTMLInputElement>) => void {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const processedValue = handleNumberInput(inputValue);
    
    // 처리된 값이 원래 값과 다르면 input의 value를 업데이트
    if (processedValue !== inputValue) {
      e.target.value = processedValue;
    }
    
    // 숫자로 변환하여 상태 업데이트
    const numValue = processedValue === '' ? 0 : parseFloat(processedValue) || 0;
    setter(numValue);
  };
}

