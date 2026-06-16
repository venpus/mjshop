import type { WheelEvent as ReactWheelEvent } from 'react';

function isNumberInput(element: Element | null): element is HTMLInputElement {
  return element instanceof HTMLInputElement && element.type === 'number';
}

function resolveNumberInputFromWheelEvent(event: WheelEvent): HTMLInputElement | null {
  if (isNumberInput(event.target)) {
    return event.target;
  }
  if (isNumberInput(document.activeElement)) {
    return document.activeElement;
  }
  return null;
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
      const numberInput = resolveNumberInputFromWheelEvent(event);
      if (!numberInput) return;
      event.preventDefault();
      event.stopPropagation();
      numberInput.blur();
    },
    { capture: true, passive: false }
  );
}

export function handleNumberInputWheel(event: ReactWheelEvent<HTMLInputElement>): void {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.blur();
}
