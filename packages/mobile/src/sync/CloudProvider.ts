/**
 * Cloud Provider Interface
 *
 * Abstracts cloud storage operations (Dropbox, Google Drive, OneDrive).
 * Allows testing sync logic without network calls.
 */

/**
 * File metadata returned by cloud providers
 */
export interface FileMetadata {
  /** Last modified timestamp */
  modified: Date;
  /** File size in bytes */
  size?: number;
  /** Provider-specific revision/version identifier */
  rev?: string;
}

/**
 * Cloud provider interface for file operations
 */
export interface CloudProvider {
  /**
   * Read file contents from cloud storage
   *
   * @param path - File path relative to app folder
   * @returns File contents as string, or null if file doesn't exist
   * @throws Error on network or permission errors
   */
  readFile(path: string): Promise<string | null>;

  /**
   * Write file contents to cloud storage
   *
   * @param path - File path relative to app folder
   * @param contents - File contents as string
   * @throws Error on network, permission, or quota errors
   */
  writeFile(path: string, contents: string): Promise<void>;

  /**
   * Get file metadata without downloading contents
   *
   * @param path - File path relative to app folder
   * @returns File metadata, or null if file doesn't exist
   * @throws Error on network or permission errors
   */
  getMetadata(path: string): Promise<FileMetadata | null>;

  /**
   * Check if file exists in cloud storage
   *
   * @param path - File path relative to app folder
   * @returns True if file exists, false otherwise
   */
  exists(path: string): Promise<boolean>;

  /**
   * Delete file from cloud storage
   *
   * @param path - File path relative to app folder
   * @throws Error on network or permission errors
   */
  deleteFile(path: string): Promise<void>;
}

/**
 * Cloud provider error types for better error handling
 */
export enum CloudProviderError {
  /** Network connectivity issue */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Authentication token expired or invalid */
  AUTH_ERROR = 'AUTH_ERROR',
  /** File not found */
  NOT_FOUND = 'NOT_FOUND',
  /** Insufficient storage quota */
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  /** Rate limit exceeded (too many requests) */
  RATE_LIMIT = 'RATE_LIMIT',
  /** Permission denied */
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  /** Unknown error */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Custom error class for cloud provider operations
 */
export class CloudProviderException extends Error {
  constructor(
    public code: CloudProviderError,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'CloudProviderException';
  }
}
