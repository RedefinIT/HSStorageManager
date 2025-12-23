'use client';

import { useEffect, useState } from 'react';
import { Plus, HardDrive } from 'lucide-react';
import api, { StorageDevice, SystemSettings } from '@/lib/api';
import DeviceForm from '@/components/DeviceForm';
import { getDeviceTypeIcon } from '@/lib/utils';

export default function DevicesPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(data);
      setError(null);
    } catch (err) {
      setError('Failed to load devices');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleCreateDevice = async (deviceData: any) => {
    try {
      await api.createDevice(deviceData);
      setSuccessMessage(`Device "${deviceData.name}" created successfully!`);
      setShowForm(false);

      // Reload settings to show new device
      await loadSettings();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      // Error is handled in the form component
      throw err;
    }
  };

  const devices = settings ? Object.values(settings.devices) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading devices...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Storage Devices</h1>
          <p className="mt-2 text-gray-600">Manage your storage devices (OSDs)</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Device
        </button>
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

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device) => (
          <div
            key={device.name}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{getDeviceTypeIcon(device['device-type'])}</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{device.name}</h3>
                  <span className="text-sm text-gray-500">{device['device-type']}</span>
                </div>
              </div>
            </div>

            {device.description && (
              <p className="text-sm text-gray-600 mb-4">{device.description}</p>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Protocol:</span>
                <span className="font-medium text-gray-900">{device.protocol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Permission:</span>
                <span className="font-medium text-gray-900">{device.permission}</span>
              </div>
              {device.path && (
                <div className="flex flex-col gap-1">
                  <span className="text-gray-500">Path:</span>
                  <span className="font-mono text-xs text-gray-900 bg-gray-100 p-2 rounded break-all">
                    {device.path}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {devices.length === 0 && !loading && (
        <div className="text-center py-12">
          <HardDrive className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No devices</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a new storage device.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              Add Device
            </button>
          </div>
        </div>
      )}

      {/* Device Form Modal */}
      {showForm && (
        <DeviceForm
          onSubmit={handleCreateDevice}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
