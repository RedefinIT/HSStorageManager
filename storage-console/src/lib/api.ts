/**
 * HSStorageManager API Client
 * Provides type-safe API calls to the storage server
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3040/rest';

export interface FileMetadata {
  id: string;
  path: string;
  size: number;
  mimetype: string;
  orgfilename?: string;
  encoding?: string;
  status: 'staging' | 'online' | 'archived';
  container: string;
  import_date: string;
  category?: string;
  directory?: string;
  params?: Record<string, any>;
}

export interface Container {
  name: string;
  description: string;
  policyJSON: Record<string, any>;
  osds: string[];
  basepath: string;
  containertype: string;
}

export interface StorageDevice {
  name: string;
  protocol: 'file' | 'url' | 'nfs';
  'device-type': 'localHDD' | 'localSDD' | 'cloud' | 'USB-mass-storage';
  'device-id'?: string;
  description?: string;
  credentials?: Record<string, any>;
  permission: 'r' | 'w' | 'rw';
  path: string;
}

export interface SystemSettings {
  containers: Record<string, Container>;
  devices: Record<string, StorageDevice>;
}

export interface QueryResult {
  total: number;
  count: number;
  items: FileMetadata[];
}

class HSStorageAPI {
  private client: AxiosInstance;

  constructor(baseURL: string = API_BASE_URL) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // System Management
  async getSettings(): Promise<SystemSettings> {
    const response = await this.client.post('/settings');
    return response.data;
  }

  // File Operations
  async uploadFile(file: File, context?: { category?: string; directory?: string }): Promise<{ FileID: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const contextParam = context ? `?context=${JSON.stringify(context)}` : '';
    const response = await this.client.post(`/upload${contextParam}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  async getFileMetadata(bucket: string, fileID: string): Promise<FileMetadata> {
    const response = await this.client.get(`/meta/${bucket}/${fileID}`);
    return response.data;
  }

  getFileURL(bucket: string, fileID: string, thumbnail: boolean = false): string {
    const sizeParam = thumbnail ? '?size=small' : '';
    return `${this.client.defaults.baseURL}/file/${bucket}/${fileID}${sizeParam}`;
  }

  // Query Operations
  async queryObjects(bucket: string, query: any = {}): Promise<QueryResult> {
    const response = await this.client.post('/objects', {
      params: { bucket },
      query,
    });
    return response.data.result;
  }

  // Bulk Operations
  async bulkMove(items: Array<{ id: string; sourcebucket: string; targetbucket: string }>): Promise<void> {
    await this.client.post('/bulkmove', items);
  }

  async bulkMove1(
    fileslist: Array<{ id: string; path: string }>,
    sourcebucket: string,
    targetbucket: string
  ): Promise<void> {
    await this.client.post('/bulkmove1', {
      params: {
        sourcebucket,
        targetbucket,
        fileslist,
      },
    });
  }

  async bulkUpdate(updates: Array<Partial<FileMetadata> & { id: string; container: string }>): Promise<void> {
    await this.client.post('/bulkupdate', updates);
  }
}

export const api = new HSStorageAPI();
export default api;
