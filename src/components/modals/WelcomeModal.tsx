import { useTranslation } from 'react-i18next';
import { Cloud, FolderOpen, CheckCircle, Lock, X } from 'lucide-react';
import { Button } from '../ui/Button';
import type { CloudDriveInfo } from '../../lib/cloudDriveDetection';

interface WelcomeModalProps {
  visible: boolean;
  suggestedClouds: CloudDriveInfo[];
  onSelectCloud: (cloud: CloudDriveInfo) => void;
  onChooseCustomFolder: () => void;
  onSkip: () => void;
}

export function WelcomeModal({
  visible,
  suggestedClouds,
  onSelectCloud,
  onChooseCustomFolder,
  onSkip,
}: WelcomeModalProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full border border-slate-700 max-h-[90vh] overflow-y-auto relative">
        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl mb-4">
            <Cloud className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            {t('welcome.title', 'Welcome to Expenses!')}
          </h2>
          <p className="text-slate-400 text-lg">
            {t('welcome.subtitle', 'Let\'s set up your data storage')}
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
            <Cloud className="w-8 h-8 text-blue-400 mb-2" />
            <h3 className="font-semibold text-white mb-1">{t('welcome.benefit1Title', 'Cloud Sync')}</h3>
            <p className="text-sm text-slate-400">
              {t('welcome.benefit1Desc', 'Access your expenses from any device')}
            </p>
          </div>

          <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
            <Lock className="w-8 h-8 text-green-400 mb-2" />
            <h3 className="font-semibold text-white mb-1">{t('welcome.benefit2Title', 'Your Data')}</h3>
            <p className="text-sm text-slate-400">
              {t('welcome.benefit2Desc', 'Stored in your own cloud folder')}
            </p>
          </div>

          <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
            <CheckCircle className="w-8 h-8 text-purple-400 mb-2" />
            <h3 className="font-semibold text-white mb-1">{t('welcome.benefit3Title', 'Auto-Save')}</h3>
            <p className="text-sm text-slate-400">
              {t('welcome.benefit3Desc', 'Never lose your data again')}
            </p>
          </div>
        </div>

        {/* Cloud provider suggestions */}
        {suggestedClouds.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-400 mb-3">
              {t('welcome.suggestedClouds', 'Recommended Cloud Storage')}
            </h3>
            <div className="space-y-2">
              {suggestedClouds.map((cloud) => (
                <button
                  key={cloud.provider}
                  onClick={() => onSelectCloud(cloud)}
                  className="w-full bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 hover:border-purple-500 rounded-xl p-4 transition-all group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{cloud.icon}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                        {cloud.name}
                      </div>
                      {cloud.path && (
                        <div className="text-sm text-slate-400 font-mono truncate">
                          {cloud.path}
                        </div>
                      )}
                      {cloud.detected && (
                        <div className="text-xs text-green-400 mt-1">
                          ✓ {t('welcome.detected', 'Detected on your system')}
                        </div>
                      )}
                    </div>
                    <FolderOpen className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom folder option */}
        <div className="border-t border-slate-700 pt-4">
          <Button
            onClick={onChooseCustomFolder}
            variant="secondary"
            className="w-full"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            {t('welcome.chooseCustomFolder', 'Choose a Different Folder')}
          </Button>
        </div>

        {/* Skip option */}
        <div className="text-center">
          <button
            onClick={onSkip}
            className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            {t('welcome.skipForNow', 'Skip for now (use localStorage)')}
          </button>
          <p className="text-xs text-slate-500 mt-1">
            {t('welcome.skipWarning', 'You can set this up later in Settings')}
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
