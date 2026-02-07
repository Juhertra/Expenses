/**
 * Dropbox Cloud Provider
 *
 * Implements CloudProvider interface using Dropbox SDK.
 * Uses "App folder" scope for isolated storage.
 *
 * File location: Dropbox/Apps/[Your App Name]/expense-tracker.json.encrypted
 */

import { Dropbox } from 'dropbox';
import type { CloudProvider, FileMetadata } from '../CloudProvider';
import { CloudProviderException, CloudProviderError } from '../CloudProvider';

const FILE_PATH = '/expense-tracker.json.encrypted';

export class DropboxProvider implements CloudProvider {
  private dbx: Dropbox;

  constructor(accessToken: string) {
    this.dbx = new Dropbox({ accessToken });
  }

  async readFile(path: string): Promise<string | null> {
    try {
      const response = await this.dbx.filesDownload({ path: FILE_PATH });

      // Response has fileBlob property with the file data
      const fileBlob = (response.result as any).fileBlob;
      if (fileBlob) {
        const text = await this.blobToString(fileBlob);
        return text;
      }

      return null;
    } catch (error: any) {
      if (error.status === 409) {
        // File not found
        return null;
      }
      throw this.handleError(error);
    }
  }

  async writeFile(path: string, contents: string): Promise<void> {
    try {
      await this.dbx.filesUpload({
        path: FILE_PATH,
        contents: contents,
        mode: { '.tag': 'overwrite' }, // Always overwrite
        autorename: false,
        mute: true,
      });
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getMetadata(path: string): Promise<FileMetadata | null> {
    try {
      const response = await this.dbx.filesGetMetadata({ path: FILE_PATH });
      const metadata = response.result;

      if (metadata['.tag'] !== 'file') {
        return null;
      }

      return {
        modified: new Date((metadata as any).client_modified || (metadata as any).server_modified),
        size: (metadata as any).size,
        rev: (metadata as any).rev,
      };
    } catch (error: any) {
      if (error.status === 409) {
        // File not found
        return null;
      }
      throw this.handleError(error);
    }
  }

  async exists(path: string): Promise<boolean> {
    const metadata = await this.getMetadata(path);
    return metadata !== null;
  }

  async deleteFile(path: string): Promise<void> {
    try {
      await this.dbx.filesDeleteV2({ path: FILE_PATH });
    } catch (error: any) {
      if (error.status === 409) {
        // File not found - not an error for delete
        return;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Convert Blob to string for reading file contents
   */
  private async blobToString(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(blob);
    });
  }

  /**
   * Map Dropbox errors to CloudProviderException
   */
  private handleError(error: any): CloudProviderException {
    // Network errors
    if (error.name === 'TypeError' || error.message?.includes('network')) {
      return new CloudProviderException(
        CloudProviderError.NETWORK_ERROR,
        'Network error. Please check your internet connection.',
        error
      );
    }

    // HTTP status codes
    switch (error.status) {
      case 401:
      case 403:
        return new CloudProviderException(
          CloudProviderError.AUTH_ERROR,
          'Authentication failed. Please re-connect your Dropbox account.',
          error
        );

      case 429:
        return new CloudProviderException(
          CloudProviderError.RATE_LIMIT,
          'Rate limit exceeded. Too many requests to Dropbox.',
          error
        );

      case 507:
        return new CloudProviderException(
          CloudProviderError.QUOTA_EXCEEDED,
          'Dropbox storage quota exceeded.',
          error
        );

      case 404:
      case 409:
        return new CloudProviderException(
          CloudProviderError.NOT_FOUND,
          'File not found in Dropbox.',
          error
        );

      default:
        return new CloudProviderException(
          CloudProviderError.UNKNOWN,
          `Dropbox error: ${error.message || 'Unknown error'}`,
          error
        );
    }
  }
}
