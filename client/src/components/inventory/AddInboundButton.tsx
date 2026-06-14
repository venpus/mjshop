import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AddInboundModal } from './AddInboundModal';

interface AddInboundButtonProps {
  className?: string;
  onAdded?: () => void;
}

export function AddInboundButton({ className = '', onAdded }: AddInboundButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium ${className}`}
      >
        <Plus className="w-5 h-5" />
        <span>입고 추가</span>
      </button>

      <AddInboundModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={() => {
          setIsOpen(false);
          onAdded?.();
        }}
      />
    </>
  );
}
