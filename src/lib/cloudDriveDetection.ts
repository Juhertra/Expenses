/**
 * Cloud drive detection utility
 * Detects if a folder path is inside a cloud storage provider
 */

export type CloudProvider = 'google-drive' | 'onedrive' | 'dropbox' | 'icloud' | 'nextcloud' | 'unknown';

export interface CloudDriveInfo {
  provider: CloudProvider;
  name: string;
  icon: string;
  detected: boolean;
  path?: string;
}

/**
 * Detect cloud provider from folder path or name
 */
export function detectCloudProvider(path: string): CloudProvider {
  const normalized = path.toLowerCase().replace(/\\/g, '/');

  // Google Drive detection
  if (
    normalized.includes('google drive') ||
    normalized.includes('googledrive') ||
    normalized.includes('/drive/') ||
    normalized.includes('my drive')
  ) {
    return 'google-drive';
  }

  // OneDrive detection
  if (
    normalized.includes('onedrive') ||
    normalized.includes('one drive') ||
    normalized.includes('/onedrive/')
  ) {
    return 'onedrive';
  }

  // Dropbox detection
  if (
    normalized.includes('dropbox') ||
    normalized.includes('/dropbox/')
  ) {
    return 'dropbox';
  }

  // iCloud Drive detection
  if (
    normalized.includes('icloud') ||
    normalized.includes('icloud drive') ||
    normalized.includes('library/mobile documents') ||
    normalized.includes('com~apple~clouddocs')
  ) {
    return 'icloud';
  }

  // Nextcloud detection
  if (
    normalized.includes('nextcloud') ||
    normalized.includes('/nextcloud/')
  ) {
    return 'nextcloud';
  }

  return 'unknown';
}

/**
 * Get cloud provider info
 */
export function getCloudProviderInfo(provider: CloudProvider): Omit<CloudDriveInfo, 'detected' | 'path'> {
  switch (provider) {
    case 'google-drive':
      return {
        provider: 'google-drive',
        name: 'Google Drive',
        icon: '☁️',
      };
    case 'onedrive':
      return {
        provider: 'onedrive',
        name: 'OneDrive',
        icon: '☁️',
      };
    case 'dropbox':
      return {
        provider: 'dropbox',
        name: 'Dropbox',
        icon: '📦',
      };
    case 'icloud':
      return {
        provider: 'icloud',
        name: 'iCloud Drive',
        icon: '☁️',
      };
    case 'nextcloud':
      return {
        provider: 'nextcloud',
        name: 'Nextcloud',
        icon: '☁️',
      };
    default:
      return {
        provider: 'unknown',
        name: 'Local Folder',
        icon: '📁',
      };
  }
}

/**
 * Analyze a folder and return cloud drive info
 */
export function analyzeFolder(path: string): CloudDriveInfo {
  const provider = detectCloudProvider(path);
  const info = getCloudProviderInfo(provider);

  return {
    ...info,
    detected: provider !== 'unknown',
    path,
  };
}

/**
 * Get suggested cloud drive paths for current platform
 * This works in conjunction with Electron's preload script
 */
export function getSuggestedCloudPaths(): CloudDriveInfo[] {
  // Check if running in Electron with suggested folders
  if (typeof window !== 'undefined' && (window as any).electronAPI?.suggestedFolders) {
    const folders = (window as any).electronAPI.suggestedFolders;

    // Ensure folders is actually an array
    if (Array.isArray(folders)) {
      return folders.map((folder: { name: string; path: string }) =>
        analyzeFolder(folder.path)
      );
    }
  }

  // Fallback suggestions for browser (based on common patterns)
  const platform = navigator.platform.toLowerCase();
  const suggestions: CloudDriveInfo[] = [];

  if (platform.includes('win')) {
    // Windows suggestions
    suggestions.push(
      {
        provider: 'onedrive',
        name: 'OneDrive',
        icon: '☁️',
        detected: false,
      },
      {
        provider: 'google-drive',
        name: 'Google Drive',
        icon: '☁️',
        detected: false,
      },
      {
        provider: 'dropbox',
        name: 'Dropbox',
        icon: '📦',
        detected: false,
      }
    );
  } else if (platform.includes('mac')) {
    // macOS suggestions
    suggestions.push(
      {
        provider: 'icloud',
        name: 'iCloud Drive',
        icon: '☁️',
        detected: false,
      },
      {
        provider: 'google-drive',
        name: 'Google Drive',
        icon: '☁️',
        detected: false,
      },
      {
        provider: 'dropbox',
        name: 'Dropbox',
        icon: '📦',
        detected: false,
      }
    );
  } else {
    // Linux suggestions
    suggestions.push(
      {
        provider: 'dropbox',
        name: 'Dropbox',
        icon: '📦',
        detected: false,
      },
      {
        provider: 'nextcloud',
        name: 'Nextcloud',
        icon: '☁️',
        detected: false,
      }
    );
  }

  return suggestions;
}
