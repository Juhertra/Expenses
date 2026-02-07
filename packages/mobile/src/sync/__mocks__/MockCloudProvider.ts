/**
 * Mock Cloud Provider for Testing
 *
 * In-memory implementation of CloudProvider interface for unit testing
 * sync logic without network calls.
 */

import type { CloudProvider, FileMetadata } from '../CloudProvider';
import { CloudProviderException, CloudProviderError } from '../CloudProvider';

interface MockFile {
  contents: string;
  modified: Date;
}

/**
 * Mock cloud provider with in-memory storage
 */
export class MockCloudProvider implements CloudProvider {
  private files: Map<string, MockFile> = new Map();
  private shouldFail: boolean = false;
  private failureError: CloudProviderError = CloudProviderError.NETWORK_ERROR;
  private readCount: number = 0;
  private writeCount: number = 0;

  /**
   * Simulate network/auth failures for testing error handling
   */
  setFailureMode(shouldFail: boolean, error: CloudProviderError = CloudProviderError.NETWORK_ERROR) {
    this.shouldFail = shouldFail;
    this.failureError = error;
  }

  /**
   * Get call counts for testing
   */
  getCallCounts() {
    return {
      reads: this.readCount,
      writes: this.writeCount,
    };
  }

  /**
   * Reset mock state (call between tests)
   */
  reset() {
    this.files.clear();
    this.shouldFail = false;
    this.readCount = 0;
    this.writeCount = 0;
  }

  /**
   * Seed mock with initial files for testing
   */
  seedFile(path: string, contents: string, modified: Date = new Date()) {
    this.files.set(path, { contents, modified });
  }

  async readFile(path: string): Promise<string | null> {
    this.readCount++;

    if (this.shouldFail) {
      throw new CloudProviderException(
        this.failureError,
        `Mock read failure: ${this.failureError}`
      );
    }

    const file = this.files.get(path);
    return file ? file.contents : null;
  }

  async writeFile(path: string, contents: string): Promise<void> {
    this.writeCount++;

    if (this.shouldFail) {
      throw new CloudProviderException(
        this.failureError,
        `Mock write failure: ${this.failureError}`
      );
    }

    this.files.set(path, {
      contents,
      modified: new Date(),
    });
  }

  async getMetadata(path: string): Promise<FileMetadata | null> {
    if (this.shouldFail) {
      throw new CloudProviderException(
        this.failureError,
        `Mock metadata failure: ${this.failureError}`
      );
    }

    const file = this.files.get(path);
    if (!file) return null;

    return {
      modified: file.modified,
      size: file.contents.length,
    };
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async deleteFile(path: string): Promise<void> {
    if (this.shouldFail) {
      throw new CloudProviderException(
        this.failureError,
        `Mock delete failure: ${this.failureError}`
      );
    }

    this.files.delete(path);
  }
}
