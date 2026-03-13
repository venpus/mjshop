import { NavLink, Outlet } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { ProductCollabCountsProvider, useProductCollabCounts } from './ProductCollabCountsContext';

const tabConfig = [
  { to: '', end: true, labelKey: 'productCollab.aiWorkAssistant', showCount: false, activeBg: 'bg-[#2563EB]', activeText: 'text-white', inactiveBg: 'bg-[#DBEAFE]', inactiveText: 'text-[#1E40AF]' },
  { to: 'list', end: false, labelKey: 'productCollab.productList', showCount: true, countKey: 'activeCount', activeBg: 'bg-[#059669]', activeText: 'text-white', inactiveBg: 'bg-[#D1FAE5]', inactiveText: 'text-[#047857]' },
  { to: 'archive', end: false, labelKey: 'productCollab.archive', showCount: true, countKey: 'archiveCount', activeBg: 'bg-[#B45309]', activeText: 'text-white', inactiveBg: 'bg-[#FEF3C7]', inactiveText: 'text-[#B45309]' },
  { to: 'cancelled', end: false, labelKey: 'productCollab.cancelledList', showCount: true, countKey: 'cancelledCount', activeBg: 'bg-[#B91C1C]', activeText: 'text-white', inactiveBg: 'bg-[#FEE2E2]', inactiveText: 'text-[#B91C1C]' },
] as const;

function ProductCollabLayoutInner() {
  const { t } = useLanguage();
  const { counts } = useProductCollabCounts() ?? {};
  return (
    <div className="flex flex-col h-full bg-[#F8F9FB]">
      <nav className="shrink-0 flex items-stretch gap-1 p-2 sm:p-3 border-b border-[#E5E7EB] bg-white overflow-x-auto overflow-y-hidden">
        {tabConfig.map(({ to, end, labelKey, showCount, countKey, activeBg, activeText, inactiveBg, inactiveText }) => {
          const count = countKey && counts ? counts[countKey] : undefined;
          return (
            <NavLink
              key={to || 'dashboard'}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center justify-center gap-1 sm:gap-2 flex-1 min-w-0 px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${
                  isActive ? `${activeBg} ${activeText}` : `${inactiveBg} ${inactiveText} hover:opacity-90`
                }`
              }
            >
              <span className="min-w-0 truncate">{t(labelKey)}</span>
              {showCount && count !== undefined && (
                <span className="shrink-0 text-[10px] sm:text-xs opacity-90">({count})</span>
              )}
            </NavLink>
          );
        })}
      </nav>
      <main className="flex-1 min-h-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export function ProductCollabLayout() {
  return (
    <ProductCollabCountsProvider>
      <ProductCollabLayoutInner />
    </ProductCollabCountsProvider>
  );
}
