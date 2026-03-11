import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, List, Archive, XCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ProductCollabCountsProvider, useProductCollabCounts } from './ProductCollabCountsContext';

function ProductCollabLayoutInner() {
  const { t } = useLanguage();
  const { counts } = useProductCollabCounts() ?? {};
  const navItems = [
    { to: '', end: true, label: t('productCollab.dashboard'), icon: LayoutDashboard, showCount: false },
    { to: 'list', end: false, label: t('productCollab.productList'), icon: List, showCount: true, count: counts?.activeCount },
    { to: 'archive', end: false, label: t('productCollab.archive'), icon: Archive, showCount: true, count: counts?.archiveCount },
    { to: 'cancelled', end: false, label: t('productCollab.cancelledList'), icon: XCircle, showCount: true, count: counts?.cancelledCount },
  ];
  return (
    <div className="flex flex-col h-full bg-[#F8F9FB]">
      <nav className="shrink-0 flex items-stretch gap-1 p-2 sm:p-3 border-b border-[#E5E7EB] bg-white overflow-x-auto overflow-y-hidden">
        {navItems.map(({ to, end, label, icon: Icon, showCount, count }) => (
          <NavLink
            key={to || 'dashboard'}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center justify-center gap-1 sm:gap-2 flex-1 min-w-0 px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${
                isActive
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#1F2937] hover:bg-[#E5E7EB]'
              }`
            }
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="min-w-0 truncate">{label}</span>
            {showCount && count !== undefined && (
              <span className="shrink-0 text-[10px] sm:text-xs opacity-90">({count})</span>
            )}
          </NavLink>
        ))}
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
