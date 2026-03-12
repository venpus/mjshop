import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getDashboardShowBothLanguages, setDashboardShowBothLanguages } from '../constants/settings';

export function Settings() {
  const { t } = useLanguage();
  const [showBoth, setShowBoth] = useState(false);

  useEffect(() => {
    setShowBoth(getDashboardShowBothLanguages());
  }, []);

  const handleToggle = (checked: boolean) => {
    setShowBoth(checked);
    setDashboardShowBothLanguages(checked);
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold text-[#1F2937] mb-6">{t('menu.settings')}</h1>

      <section className="bg-white rounded-xl border border-[#E5E7EB] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[#1F2937]">
              {t('settings.dashboardShowBothLanguages')}
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {t('settings.dashboardShowBothLanguagesDesc')}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showBoth}
            onClick={() => handleToggle(!showBoth)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 ${
              showBoth ? 'bg-[#7C3AED]' : 'bg-[#E5E7EB]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                showBoth ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>
    </div>
  );
}
