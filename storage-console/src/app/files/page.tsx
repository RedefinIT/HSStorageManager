'use client';

import { useEffect, useState } from 'react';
import { Upload, Download, Trash2, FolderOpen, RefreshCw } from 'lucide-react';
import api, { Container, FileMetadata, SystemSettings } from '@/lib/api';
import FileUpload from '@/components/FileUpload';
import { formatBytes } from '@/lib/utils';

export default function FilesPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(data);

      // Auto-select first container
      const containers = Object.keys(data.containers);
      if (containers.length > 0 && !selectedContainer) {
        setSelectedContainer(containers[0]);
      }

      setError(null);
    } catch (err) {
      setError('Failed to load containers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (containerName: string) => {
    if (!containerName) return;

    try {
      setFilesLoading(true);
      setError(null);
      const result = await api.queryObjects(containerName, {});
      setFiles(result.items || []);
    } catch (err: any) {
      setError(`Failed to load files: ${err.message}`);
      console.error(err);
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (selectedContainer) {
      loadFiles(selectedContainer);
    }
  }, [selectedContainer]);

  const handleDownload = (file: FileMetadata) => {
    const url = api.getFileURL(file.container, file.id);
    window.open(url, '_blank');
  };

  const handleDelete = async (file: FileMetadata) => {
    if (!confirm(`Are you sure you want to delete "${file.orgfilename || file.id}"?`)) {
      return;
    }

    try {
      await api.deleteFile(file.container, file.id);
      setSuccessMessage(`File "${file.orgfilename || file.id}" deleted successfully`);

      // Reload files
      loadFiles(selectedContainer);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(`Failed to delete file: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleUploadComplete = () => {
    setShowUpload(false);
    setSuccessMessage('File uploaded successfully!');
    loadFiles(selectedContainer);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleRefresh = () => {
    loadFiles(selectedContainer);
  };

  const containers = settings ? Object.values(settings.containers) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Files</h1>
          <p className="mt-2 text-gray-600">Browse and manage files in containers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={!selectedContainer || filesLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={20} className={filesLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowUpload(true)}
            disabled={!selectedContainer}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Upload size={20} />
            Upload File
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Container Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <label htmlFor="container" className="block text-sm font-medium text-gray-700 mb-2">
          Select Container
        </label>
        <select
          id="container"
          value={selectedContainer}
          onChange={(e) => setSelectedContainer(e.target.value)}
          className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Select a container --</option>
          {containers.map((container) => (
            <option key={container.name} value={container.name}>
              {container.name} ({container.containertype})
            </option>
          ))}
        </select>
      </div>

      {/* Files List */}
      {selectedContainer && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Files in "{selectedContainer}"
              {!filesLoading && <span className="text-sm text-gray-500 ml-2">({files.length} files)</span>}
            </h2>
          </div>

          {filesLoading ? (
            <div className="p-12 text-center text-gray-500">
              <RefreshCw className="animate-spin mx-auto mb-2" size={32} />
              Loading files...
            </div>
          ) : files.length === 0 ? (
            <div className="p-12 text-center">
              <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <h3 className="text-sm font-medium text-gray-900">No files</h3>
              <p className="mt-1 text-sm text-gray-500">Upload a file to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Upload Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {files.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {file.orgfilename || file.id}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{file.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatBytes(file.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {file.mimetype || 'unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          file.status === 'online' ? 'bg-green-100 text-green-800' :
                          file.status === 'staging' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {file.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(file.import_date).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDownload(file)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Download"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(file)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!selectedContainer && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          <h3 className="text-sm font-medium text-gray-900">No container selected</h3>
          <p className="mt-1 text-sm text-gray-500">Select a container to view its files.</p>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <FileUpload
          onUploadComplete={handleUploadComplete}
          onCancel={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
