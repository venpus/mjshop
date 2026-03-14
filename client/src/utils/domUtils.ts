/**
 * 요소의 스크롤 가능한 부모를 반환합니다.
 * overflow-y: auto | scroll | overlay 인 첫 번째 조상을 찾습니다.
 * 없으면 null (뷰포트 스크롤)을 의미합니다.
 */
export function getScrollParent(element: Element | null): Element | null {
  if (!element || typeof document === 'undefined') return null;
  let parent: Element | null = element.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}
