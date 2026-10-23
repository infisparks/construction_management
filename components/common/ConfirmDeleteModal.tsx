'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  itemName?: string;
  warningMessage?: string;
  requireKeyword?: string; // Default: 'DELETE'
  isLoading?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  warningMessage,
  requireKeyword = 'DELETE',
  isLoading = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isMatched = inputValue.trim().toUpperCase() === requireKeyword.toUpperCase();
  const busy = isLoading || submitting;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isMatched || busy) return;

    try {
      setSubmitting(true);
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Failed to confirm deletion:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 text-xs space-y-4 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="confirm-delete-title" className="text-base font-bold text-slate-900">
                {title}
              </h3>
              {itemName && (
                <p className="text-xs font-semibold text-rose-700 bg-rose-50/70 border border-rose-200/60 rounded-md px-2 py-1 mt-1.5 break-all">
                  {itemName}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Body */}
        <div className="space-y-2 text-slate-600 leading-relaxed">
          <p>
            {warningMessage ||
              'This record will be marked as deleted. It will be immediately ignored across all calculations, reports, and active lists.'}
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-700">
            <span className="block text-[11px] text-slate-500 mb-1 font-medium">
              To proceed, please type <strong className="text-rose-700 font-mono tracking-wider">{requireKeyword}</strong> below:
            </span>
            <input
              type="text"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isMatched) {
                  handleSubmit();
                }
              }}
              placeholder={`Type ${requireKeyword} to confirm`}
              disabled={busy}
              className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!isMatched || busy}
            className={`px-4 py-2 rounded-lg font-semibold text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              isMatched && !busy
                ? 'bg-rose-600 hover:bg-rose-700 cursor-pointer'
                : 'bg-rose-300 cursor-not-allowed opacity-60'
            }`}
          >
            {busy ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
