"use client";

interface MobileBackdropProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileBackdrop({ isOpen, onClose }: MobileBackdropProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
      onClick={onClose}
      aria-hidden="true"
    />
  );
}
