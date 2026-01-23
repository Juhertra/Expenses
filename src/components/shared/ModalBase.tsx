import { useCallback, useEffect, useRef, useState, ReactNode } from 'react';
import { X } from 'lucide-react';
import { fadeIn, fadeOut, fadeScaleIn, fadeScaleOut, withOnFinish } from '../../lib/animations/animeHelpers';

interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxHeight?: string;
  maxWidth?: string;
}

export function ModalBase({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = '90vh',
  maxWidth = '2xl',
}: ModalBaseProps) {
  const MAX_W: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  };
  const maxWClass = MAX_W[maxWidth] ?? 'max-w-2xl';
  const [visible, setVisible] = useState(isOpen);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const closingRef = useRef(false);

  // Sync visible state when opening
  useEffect(() => {
    if (isOpen) {
      closingRef.current = false;
      setVisible(true);
    }
  }, [isOpen]);

  // Animate enter
  useEffect(() => {
    if (!isOpen || !visible) return;
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    if (panel) fadeScaleIn(panel, 200);
    if (overlay) fadeIn(overlay, 200);
  }, [isOpen, visible]);

  // Animate exit when parent closes (no onClose here)
  useEffect(() => {
    if (isOpen || !visible) return;
    closingRef.current = true;
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    const anim1 = panel ? fadeScaleOut(panel, 200) : undefined;
    const anim2 = overlay ? fadeOut(overlay, 200) : undefined;
    const waitAnim = anim1 ?? anim2;
    const finish = () => {
      closingRef.current = false;
      setVisible(false);
    };
    if (waitAnim) {
      withOnFinish(waitAnim, finish);
    } else {
      finish();
    }
  }, [isOpen, visible]);

  // Handle escape key using close flow
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    const anim1 = panel ? fadeScaleOut(panel, 200) : undefined;
    const anim2 = overlay ? fadeOut(overlay, 200) : undefined;
    const waitAnim = anim1 ?? anim2;
    const finish = () => {
      closingRef.current = false;
      onClose();
    };
    if (waitAnim) {
      withOnFinish(waitAnim, finish);
    } else {
      finish();
    }
  }, [onClose]);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, requestClose]);

  if (!visible) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={requestClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={panelRef}
        className={`bg-slate-800 rounded-2xl p-6 w-full ${maxWClass} border border-slate-700 my-8`}
        style={{ maxHeight }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="modal-title" className="text-2xl font-bold">
            {title}
          </h2>
          <button
            onClick={requestClose}
            aria-label="Close modal"
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

