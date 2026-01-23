import { useCallback, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cancelAnimation, slideFadeInUp, slideFadeOutDown, withOnFinish, canAnimate } from '../../lib/animations/animeHelpers';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const toastRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingRef = useRef(false);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const target = toastRef.current;
    const anim = target ? slideFadeOutDown(target, 180) : undefined;
    const finish = () => {
      closingRef.current = false;
      onClose();
    };
    if (anim) {
      withOnFinish(anim, finish);
    } else {
      finish();
    }
  }, [onClose]);

  useEffect(() => {
    const node = toastRef.current;
    if (node && canAnimate()) {
      slideFadeInUp(node, 200);
    }
    timeoutRef.current = setTimeout(requestClose, duration);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      cancelAnimation(toastRef.current);
    };
  }, [duration, requestClose]);

  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  const Icon = type === 'success' ? CheckCircle : AlertCircle;

  return (
    <div
      ref={toastRef}
      className={`fixed top-4 ${isRTL ? 'left-4' : 'right-4'} ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50`}
    >
      <Icon className="w-5 h-5" />
      <span>{message}</span>
      <button
        onClick={requestClose}
        className={`${isRTL ? 'mr-2' : 'ml-2'} hover:bg-white/20 rounded p-1 transition-colors`}
        aria-label={t('buttons.close')}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

