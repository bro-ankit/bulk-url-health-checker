'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import type { ModalProps } from './modal.types';

export const Modal = ({ open, onClose, title, children }: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="m-auto rounded-xl p-0 border border-gray-200 shadow-2xl backdrop:bg-black/50 max-w-xl w-[calc(100%-2rem)]"
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
};
