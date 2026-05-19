import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface ManufacturingEditorLayoutProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  backLabel: string;
  children: ReactNode;
}

export function ManufacturingEditorLayout({
  title,
  subtitle,
  onBack,
  backLabel,
  children,
}: ManufacturingEditorLayoutProps) {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto print:max-w-none">
      <div className="flex flex-wrap items-center gap-2 mb-4 no-print">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          {backLabel}
        </button>
      </div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle ? <p className="text-sm text-gray-500 mt-1">{subtitle}</p> : null}
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">{children}</div>
    </div>
  );
}
