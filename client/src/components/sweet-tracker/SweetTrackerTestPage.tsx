import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SweetTrackerBulkPanel } from './SweetTrackerBulkPanel';
import { SweetTrackerCachedListPanel } from './SweetTrackerCachedListPanel';

export function SweetTrackerTestPage() {
  const { t } = useLanguage();
  const [cacheListVersion, setCacheListVersion] = useState(0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
      <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
        {t('sweetTracker.pageTitle')}
      </h1>

      <SweetTrackerBulkPanel onBulkSuccess={() => setCacheListVersion((v) => v + 1)} />

      <SweetTrackerCachedListPanel reloadKey={cacheListVersion} />
    </div>
  );
}
