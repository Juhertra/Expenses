import { useTranslation } from 'react-i18next';
import { FolderOpen, AlertCircle, X } from 'lucide-react';
import { Button } from '../ui/Button';
import type { CloudDriveInfo } from '../../lib/cloudDriveDetection';

interface FolderSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  suggestedClouds: CloudDriveInfo[];
  onSelectCloud: (cloud: CloudDriveInfo) => void;
  onChooseCustomFolder: () => void;
}

export function FolderSelectionModal({
  visible,
  onClose,
  suggestedClouds,
  onSelectCloud,
  onChooseCustomFolder,
}: FolderSelectionModalProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full border border-slate-700 max-h-[90vh] overflow-y-auto relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-500/20 rounded-xl">
              <FolderOpen className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {t('folderSelection.title', 'Select Save Folder')}
              </h2>
              <p className="text-sm text-slate-400">
                {t('folderSelection.subtitle', 'Where should we save your data?')}
              </p>
            </div>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-semibold mb-1">
                {t('folderSelection.infoTitle', 'Why select a folder?')}
              </p>
              <ul className="space-y-1 text-blue-300">
                <li>• {t('folderSelection.info1', 'Your data is saved to a file in this folder')}</li>
                <li>• {t('folderSelection.info2', 'Auto-saves every change (1.5s debounce)')}</li>
                <li>• {t('folderSelection.info3', 'Use a cloud folder to sync across devices')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Cloud provider suggestions */}
        {suggestedClouds.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-400 mb-3">
              {t('folderSelection.recommended', 'Recommended (Cloud Synced)')}
            </h3>
            <div className="space-y-2">
              {suggestedClouds.map((cloud) => (
                <button
                  key={cloud.provider}
                  onClick={() => onSelectCloud(cloud)}
                  className="w-full bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 hover:border-purple-500 rounded-lg p-3 transition-all group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{cloud.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                        {cloud.name}
                      </div>
                      {cloud.path && (
                        <div className="text-xs text-slate-400 font-mono truncate">
                          {cloud.path}
                        </div>
                      )}
                      {cloud.detected && (
                        <div className="text-xs text-green-400 mt-0.5">
                          ✓ {t('folderSelection.available', 'Available')}
                        </div>
                      )}
                    </div>
                    <FolderOpen className="w-4 h-4 text-slate-400 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom folder option */}
        <div className={suggestedClouds.length > 0 ? 'border-t border-slate-700 pt-4' : ''}>
          <h3 className="text-sm font-semibold text-slate-400 mb-2">
            {t('folderSelection.orChoose', 'Or choose any folder')}
          </h3>
          <Button
            onClick={onChooseCustomFolder}
            variant="secondary"
            className="w-full"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            {t('folderSelection.browse', 'Browse for Folder...')}
          </Button>
        </div>

        {/* Cancel */}
        <div className="text-center pt-2">
          <button
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            {t('buttons.cancel', 'Cancel')}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
