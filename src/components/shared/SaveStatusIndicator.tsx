import { useTranslation } from 'react-i18next';
import { Cloud, CloudOff, CheckCircle, Loader } from 'lucide-react';
import { analyzeFolder, type CloudDriveInfo } from '../../lib/cloudDriveDetection';
import { useState, useEffect } from 'react';

interface SaveStatusIndicatorProps {
  dirty: boolean;
  saving: boolean;
  lastSaveDate: string | null;
  saveDirectory: FileSystemDirectoryHandle | null;
  onSelectFolder?: () => void;
}

export function SaveStatusIndicator({
  dirty,
  saving,
  lastSaveDate,
  saveDirectory,
  onSelectFolder,
}: SaveStatusIndicatorProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [cloudInfo, setCloudInfo] = useState<CloudDriveInfo | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Analyze folder to detect cloud provider
  useEffect(() => {
    if (saveDirectory) {
      // Try to get the folder name/path
      const folderName = saveDirectory.name || '';
      const info = analyzeFolder(folderName);
      setCloudInfo(info);
    } else {
      setCloudInfo(null);
    }
  }, [saveDirectory]);

  // Format last save time
  const getLastSaveText = () => {
    if (!lastSaveDate) return null;

    try {
      const date = new Date(lastSaveDate);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return t('saveStatus.justNow', 'Just now');
      if (diffMins === 1) return t('saveStatus.oneMinuteAgo', '1 minute ago');
      if (diffMins < 60) return t('saveStatus.minutesAgo', '{{count}} minutes ago', { count: diffMins });

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours === 1) return t('saveStatus.oneHourAgo', '1 hour ago');
      if (diffHours < 24) return t('saveStatus.hoursAgo', '{{count}} hours ago', { count: diffHours });

      return date.toLocaleString();
    } catch {
      return null;
    }
  };

  // Status states
  const isSaved = !dirty && !saving && lastSaveDate;
  const needsFolder = !saveDirectory;

  // Status text
  const getStatusText = () => {
    if (saving) return t('saveStatus.saving', 'Saving...');
    if (needsFolder) return t('saveStatus.noFolder', 'Select folder');
    if (isSaved) return t('saveStatus.saved', 'All changes saved');
    if (dirty) return t('saveStatus.unsaved', 'Unsaved changes');
    return t('saveStatus.ready', 'Ready');
  };

  // Status color
  const getStatusColor = () => {
    if (saving) return 'text-blue-400';
    if (needsFolder) return 'text-yellow-400';
    if (isSaved) return 'text-green-400';
    if (dirty) return 'text-orange-400';
    return 'text-slate-400';
  };

  // Icon
  const getIcon = () => {
    if (saving) return <Loader className="w-4 h-4 animate-spin" />;
    if (needsFolder) return <CloudOff className="w-4 h-4" />;
    if (isSaved) return <CheckCircle className="w-4 h-4" />;
    if (cloudInfo?.detected) return <Cloud className="w-4 h-4" />;
    return <Cloud className="w-4 h-4" />;
  };

  const lastSaveText = getLastSaveText();

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Status indicator */}
      <button
        onClick={needsFolder ? onSelectFolder : undefined}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all
          ${needsFolder
            ? 'bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 cursor-pointer'
            : 'bg-slate-700/30 border border-slate-600/30'
          }
        `}
      >
        <span className={getStatusColor()}>
          {getIcon()}
        </span>
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className={`absolute top-full ${isRTL ? 'left-0' : 'right-0'} mt-1 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-4 z-[9999]`}>
          <div className="space-y-3">
            {/* Folder info */}
            {saveDirectory ? (
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-1">
                  {t('saveStatus.saveLocation', 'Save Location')}
                </div>
                <div className="flex items-center gap-2">
                  {cloudInfo?.detected && <span className="text-lg">{cloudInfo.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {cloudInfo?.detected ? cloudInfo.name : saveDirectory.name}
                    </div>
                    {cloudInfo?.detected && (
                      <div className="text-xs text-green-400">
                        {t('saveStatus.cloudSynced', 'Cloud synced')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-1">
                  {t('saveStatus.saveLocation', 'Save Location')}
                </div>
                <div className="text-sm text-yellow-400">
                  {t('saveStatus.noFolderSelected', 'No folder selected')}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {t('saveStatus.clickToSelect', 'Click to select a folder')}
                </div>
              </div>
            )}

            {/* Last save time */}
            {lastSaveText && (
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-1">
                  {t('saveStatus.lastSaved', 'Last Saved')}
                </div>
                <div className="text-sm text-white">
                  {lastSaveText}
                </div>
              </div>
            )}

            {/* Auto-save status */}
            {saveDirectory && (
              <div className="pt-2 border-t border-slate-700">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <CheckCircle className="w-3 h-3" />
                  <span>{t('saveStatus.autoSaveEnabled', 'Auto-save enabled (1.5s delay)')}</span>
                </div>
              </div>
            )}

            {/* Using localStorage fallback */}
            {!saveDirectory && (
              <div className="pt-2 border-t border-slate-700">
                <div className="text-xs text-slate-400">
                  {t('saveStatus.usingLocalStorage', 'Currently using browser localStorage (not synced)')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
