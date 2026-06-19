import { useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { formatDocumentTitle, resolveDocumentTitleParts } from '../utils/pageTitle';

export function useDocumentTitle(pathname: string, search = '') {
  const { t, language } = useLanguage();

  useEffect(() => {
    const parts = resolveDocumentTitleParts(pathname, search);
    document.title = formatDocumentTitle(t, parts);
  }, [pathname, search, t, language]);
}
