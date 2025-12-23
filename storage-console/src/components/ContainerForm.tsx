'use client';

import { useState, useEffect } from 'react';
import { Container, StorageDevice } from '@/lib/api';
import { X } from 'lucide-react';

interface ContainerFormProps {
  onSubmit: (containerData: Omit<Container, 'policyJSON'> & {
    policyJSON?: Record<string, any>;
  }) => Promise<void>;
  onCancel: () => void;
  availableDevices: Record<string, StorageDevice>;
}

export default function ContainerForm({ onSubmit, onCancel, availableDevices }: ContainerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    osds: [] as string[],
    basepath: '',
    containertype: 'general',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.osds.length === 0) {
      setError('Please select at least one storage device');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        policyJSON: {},
      });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create container');
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDeviceToggle = (deviceName: string) => {
    setFormData(prev => {
      const osds = prev.osds.includes(deviceName)
        ? prev.osds.filter(d => d !== deviceName)
        : [...prev.osds, deviceName];
      return { ...prev, osds };
    });
  };

  const deviceList = Object.values(availableDevices);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Add Storage Container</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Container Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., media1, docs, backup"
              />
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
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of this container"
              />
            </div>

            {/* Container Type */}
            <div>
              <label htmlFor="containertype" className="block text-sm font-medium text-gray-700 mb-1">
                Container Type *
              </label>
              <select
                id="containertype"
                name="containertype"
                required
                value={formData.containertype}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">General</option>
                <option value="media">Media</option>
                <option value="docs">Documents</option>
                <option value="backup">Backup</option>
                <option value="staging">Staging</option>
                <option value="cache">Cache</option>
                <option value="system">System</option>
                <option value="thumbnails">Thumbnails</option>
              </select>
            </div>

            {/* Base Path */}
            <div>
              <label htmlFor="basepath" className="block text-sm font-medium text-gray-700 mb-1">
                Base Path *
              </label>
              <input
                type="text"
                id="basepath"
                name="basepath"
                required
                value={formData.basepath}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="/media1"
              />
              <p className="mt-1 text-sm text-gray-500">
                Virtual path prefix for files in this container
              </p>
            </div>

            {/* Storage Devices Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Storage Devices (OSDs) *
              </label>
              <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                {deviceList.length === 0 ? (
                  <p className="text-sm text-gray-500">No storage devices available. Please add a device first.</p>
                ) : (
                  <div className="space-y-2">
                    {deviceList.map((device) => (
                      <label
                        key={device.name}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.osds.includes(device.name)}
                          onChange={() => handleDeviceToggle(device.name)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{device.name}</span>
                            <span className="text-xs text-gray-500">({device['device-type']})</span>
                          </div>
                          {device.description && (
                            <p className="text-xs text-gray-500">{device.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {formData.osds.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {formData.osds.join(', ')}
                </p>
              )}
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
                disabled={isSubmitting || deviceList.length === 0}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Container'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
