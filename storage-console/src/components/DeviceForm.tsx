'use client';

import { useState } from 'react';
import { StorageDevice } from '@/lib/api';

interface DeviceFormProps {
  onSubmit: (deviceData: Omit<StorageDevice, 'device-id' | 'credentials'> & {
    'device-id'?: string;
    credentials?: Record<string, any>;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function DeviceForm({ onSubmit, onCancel }: DeviceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    protocol: 'file' as 'file' | 'url' | 'nfs',
    'device-type': 'localHDD' as 'localHDD' | 'localSDD' | 'cloud' | 'USB-mass-storage',
    permission: 'rw' as 'r' | 'w' | 'rw',
    path: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create device');
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Storage Device</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Device Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., localhdd1, google-drive"
              />
            </div>

            {/* Protocol */}
            <div>
              <label htmlFor="protocol" className="block text-sm font-medium text-gray-700 mb-1">
                Protocol *
              </label>
              <select
                id="protocol"
                name="protocol"
                required
                value={formData.protocol}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="file">file</option>
                <option value="url">url</option>
                <option value="nfs">nfs</option>
              </select>
            </div>

            {/* Device Type */}
            <div>
              <label htmlFor="device-type" className="block text-sm font-medium text-gray-700 mb-1">
                Device Type *
              </label>
              <select
                id="device-type"
                name="device-type"
                required
                value={formData['device-type']}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="localHDD">Local HDD</option>
                <option value="localSDD">Local SSD</option>
                <option value="cloud">Cloud Storage</option>
                <option value="USB-mass-storage">USB Mass Storage</option>
              </select>
            </div>

            {/* Permission */}
            <div>
              <label htmlFor="permission" className="block text-sm font-medium text-gray-700 mb-1">
                Permissions *
              </label>
              <select
                id="permission"
                name="permission"
                required
                value={formData.permission}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="r">Read Only (r)</option>
                <option value="w">Write Only (w)</option>
                <option value="rw">Read/Write (rw)</option>
              </select>
            </div>

            {/* Path */}
            <div>
              <label htmlFor="path" className="block text-sm font-medium text-gray-700 mb-1">
                Path *
              </label>
              <input
                type="text"
                id="path"
                name="path"
                required
                value={formData.path}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="/home/govind/HDD/LOCALSTORAGE"
              />
              <p className="mt-1 text-sm text-gray-500">
                Full path to the storage location (leave empty for cloud devices)
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description of this device"
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Device'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
