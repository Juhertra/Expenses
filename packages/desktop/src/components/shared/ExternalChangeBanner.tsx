import { useTranslation } from 'react-i18next';
import { RefreshCw, X, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

interface ExternalChangeBannerProps {
  show: boolean;
  changedAt: string | null;
  onReload: () => void;
  onDismiss: () => void;
}

/**
 * Banner shown when the data file changes externally (e.g., cloud sync)
 */
export function ExternalChangeBanner({
  show,
  changedAt,
  onReload,
  onDismiss,
}: ExternalChangeBannerProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  if (!show) return null;

  const formattedTime = changedAt
    ? new Date(changedAt).toLocaleTimeString(i18n.language)
    : null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 bg-amber-600/95 backdrop-blur-sm border-b border-amber-500 shadow-lg`}
      role="alert"
      dir={i18n.dir()}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className={`flex items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertTriangle className="w-5 h-5 text-amber-100 flex-shrink-0" />
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm font-medium text-white">
                {t('status.fileChangedExternally', 'Data file changed externally')}
              </p>
              {formattedTime && (
                <p className="text-xs text-amber-100">
                  {t('status.changedAt', 'Changed at {{time}}', { time: formattedTime })}
                </p>
              )}
            </div>
          </div>

          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReload}
              iconStart={<RefreshCw className="w-4 h-4" />}
              className="!bg-amber-700 hover:!bg-amber-800 !text-white !border-amber-500"
            >
              {t('buttons.reload', 'Reload')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              iconStart={<X className="w-4 h-4" />}
              className="!bg-transparent hover:!bg-amber-700 !text-amber-100 !border-transparent"
              aria-label={t('buttons.dismiss', 'Dismiss')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
