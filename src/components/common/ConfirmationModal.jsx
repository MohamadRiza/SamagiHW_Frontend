import { useEffect, useRef } from 'react';
import { FaExclamationTriangle, FaTrash, FaTimes } from 'react-icons/fa';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  itemName,
  itemId,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  confirmVariant = 'danger', // 'danger' | 'primary' | 'warning'
  loading = false,
}) => {
  const modalRef = useRef(null);
  const confirmButtonRef = useRef(null);

  // Auto-focus confirm/cancel button on open and trap keys
  useEffect(() => {
    if (isOpen) {
      // Ensure window has focus in Electron
      try {
        window.focus();
      } catch (e) {}

      const timer = setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle keyboard events (Enter to confirm, Escape to cancel)
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === 'Enter' && !loading) {
      e.preventDefault();
      e.stopPropagation();
      onConfirm();
    }
  };

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: 'bg-red-100 text-red-600',
      icon: <FaTrash className="w-5 h-5" />,
      button:
        'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 focus:ring-red-500',
    },
    warning: {
      iconBg: 'bg-amber-100 text-amber-600',
      icon: <FaExclamationTriangle className="w-5 h-5" />,
      button:
        'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20 focus:ring-amber-500',
    },
    primary: {
      iconBg: 'bg-primary-100 text-primary-600',
      icon: <FaExclamationTriangle className="w-5 h-5" />,
      button:
        'bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-500/20 focus:ring-primary-500',
    },
  };

  const currentVariant = variantStyles[confirmVariant] || variantStyles.danger;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden outline-none animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${currentVariant.iconBg}`}
            >
              {currentVariant.icon}
            </div>
            <div>
              <h3 id="confirm-modal-title" className="text-base font-bold text-gray-900 leading-snug">
                {title}
              </h3>
              <p className="text-xs text-gray-400">Please confirm your action</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <FaTimes className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-3">
          <p className="text-sm text-gray-600 leading-relaxed">{message}</p>

          {itemName && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="font-semibold text-gray-900 text-sm truncate">{itemName}</p>
                {itemId && (
                  <p className="text-xs text-primary-600 font-bold font-mono mt-0.5">#{itemId}</p>
                )}
              </div>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 uppercase tracking-wider shrink-0">
                Will be deleted
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-100 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {cancelText} <span className="text-xs font-normal opacity-60">(Esc)</span>
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center gap-2 ${currentVariant.button} disabled:opacity-50`}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                Processing...
              </>
            ) : (
              <>
                {confirmText} <span className="text-xs font-normal opacity-80">(Enter)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
