import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, List, Archive } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export function ProductCollabLayout() {
  const { t } = useLanguage();
  const navItems = [
    { to: '', end: true, label: t('productCollab.dashboard'), icon: LayoutDashboard },
    { to: 'list', end: false, label: t('productCollab.productList'), icon: List },
    { to: 'archive', end: false, label: t('productCollab.archive'), icon: Archive },
  ];
  return (
    <div className="flex flex-col h-full bg-[#F8F9FB]">
      <nav className="shrink-0 flex items-center gap-1 p-3 border-b border-[#E5E7EB] bg-white">
        {navItems.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to || 'dashboard'}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#1F2937] hover:bg-[#E5E7EB]'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 min-h-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
