interface ImagePreviewTooltipProps {
  imageUrl: string | null;
  isModalOpen: boolean;
}

export function ImagePreviewTooltip({
  imageUrl,
  isModalOpen,
}: ImagePreviewTooltipProps) {
  if (!imageUrl || isModalOpen) return null;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
      }}
    >
      <img
        src={imageUrl}
        alt="미리보기"
        className="max-w-md max-h-96 object-contain rounded-lg shadow-2xl border-4 border-white"
      />
    </div>
  );
}
