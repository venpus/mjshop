function isNumberInput(element: Element | null): element is HTMLInputElement {
  return element instanceof HTMLInputElement && element.type === 'number';
}

/**
 * 포커스된 number 입력에서 마우스 휠로 값이 바뀌는 브라우저 기본 동작을 막습니다.
 * blur 처리로 페이지 스크롤은 계속 가능합니다.
 */
export function initPreventNumberInputWheelChange(): void {
  if (typeof document === 'undefined') return;

  document.addEventListener(
    'wheel',
    (event) => {
      if (!isNumberInput(document.activeElement)) return;
      event.preventDefault();
      document.activeElement.blur();
    },
    { capture: true, passive: false }
  );
}
