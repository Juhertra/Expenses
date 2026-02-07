import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
  isProcessing?: boolean;
}

/**
 * Confirmation dialog for destructive actions
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
  isProcessing = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const confirmColor =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700'
      : variant === 'warning'
      ? 'bg-yellow-600 hover:bg-yellow-700'
      : 'bg-purple-600 hover:bg-purple-700';

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-2 rounded-lg ${variant === 'danger' ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
            <AlertTriangle className={`w-6 h-6 ${variant === 'danger' ? 'text-red-400' : 'text-yellow-400'}`} />
          </div>
          <div className="flex-1">
            <h3 id="confirm-title" className="text-xl font-bold mb-2">
              {title}
            </h3>
            <p className="text-slate-300 text-sm">{message}</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={`flex-1 ${confirmColor} py-2 rounded-lg transition-colors disabled:opacity-50`}
          >
            {isProcessing ? t('status.processing') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

