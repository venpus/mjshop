export type ShopToolsExpandDirection = 'up' | 'down' | 'left' | 'right';

const PANEL_GAP = 8;
const VIEWPORT_EDGE_PAD = 16;

export const SHOP_TOOLS_PANEL_MAX_WIDTH = 320;

export function getEstimatedShopToolsPanelHeight(
  activeTool: 'cost-calculator' | null
): number {
  return activeTool === 'cost-calculator' ? 320 : 168;
}

export function resolveShopToolsExpandDirection(
  fabRect: DOMRect,
  panelWidth: number,
  panelHeight: number
): ShopToolsExpandDirection {
  const spaceAbove = fabRect.top - VIEWPORT_EDGE_PAD;
  const spaceBelow = window.innerHeight - fabRect.bottom - VIEWPORT_EDGE_PAD;
  const spaceLeft = fabRect.left - VIEWPORT_EDGE_PAD;
  const spaceRight = window.innerWidth - fabRect.right - VIEWPORT_EDGE_PAD;

  const candidates: Array<{ dir: ShopToolsExpandDirection; space: number; required: number }> = [
    { dir: 'up', space: spaceAbove, required: panelHeight + PANEL_GAP },
    { dir: 'down', space: spaceBelow, required: panelHeight + PANEL_GAP },
    { dir: 'left', space: spaceLeft, required: panelWidth + PANEL_GAP },
    { dir: 'right', space: spaceRight, required: panelWidth + PANEL_GAP },
  ];

  const fitting = candidates.filter((item) => item.space >= item.required);
  if (fitting.length > 0) {
    fitting.sort((a, b) => b.space - a.space);
    return fitting[0].dir;
  }

  const scored = candidates.map((item) => ({
    dir: item.dir,
    score: item.space - item.required,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.dir ?? 'up';
}

import type { CSSProperties } from 'react';

export function getShopToolsPanelPlacementStyle(
  direction: ShopToolsExpandDirection
): CSSProperties {
  switch (direction) {
    case 'up':
      return { right: 0, bottom: `calc(100% + ${PANEL_GAP}px)` };
    case 'down':
      return { right: 0, top: `calc(100% + ${PANEL_GAP}px)` };
    case 'left':
      return { right: `calc(100% + ${PANEL_GAP}px)`, bottom: 0 };
    case 'right':
      return { left: `calc(100% + ${PANEL_GAP}px)`, bottom: 0 };
  }
}

export function getShopToolsPanelOriginClass(direction: ShopToolsExpandDirection): string {
  switch (direction) {
    case 'up':
      return 'origin-bottom-right';
    case 'down':
      return 'origin-top-right';
    case 'left':
      return 'origin-right-bottom';
    case 'right':
      return 'origin-left-bottom';
  }
}
