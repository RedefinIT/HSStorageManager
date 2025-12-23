'use client';

import { useEffect, useState } from 'react';
import { Plus, Database } from 'lucide-react';
import api, { Container, SystemSettings } from '@/lib/api';
import ContainerForm from '@/components/ContainerForm';

export default function ContainersPage() {
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
      setError('Failed to load containers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleCreateContainer = async (containerData: any) => {
    try {
      await api.createContainer(containerData);
      setSuccessMessage(`Container "${containerData.name}" created successfully!`);
      setShowForm(false);

      // Reload settings to show new container
      await loadSettings();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      // Error is handled in the form component
      throw err;
    }
  };

  const containers = settings ? Object.values(settings.containers) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading containers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Storage Containers</h1>
          <p className="mt-2 text-gray-600">Manage your storage containers (buckets)</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Container
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

      {/* Containers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {containers.map((container) => (
          <div
            key={container.name}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Database className="text-blue-600" size={32} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{container.name}</h3>
                  <span className="text-sm text-gray-500">{container.containertype}</span>
                </div>
              </div>
            </div>

            {container.description && (
              <p className="text-sm text-gray-600 mb-4">{container.description}</p>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Base Path:</span>
                <span className="font-mono text-xs text-gray-900 bg-gray-100 px-2 py-1 rounded">
                  {container.basepath}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-gray-500">Storage Devices ({container.osds.length}):</span>
                <div className="flex flex-wrap gap-1">
                  {container.osds.map((osd) => (
                    <span
                      key={osd}
                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                    >
                      {osd}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {containers.length === 0 && !loading && (
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No containers</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a new storage container.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              Add Container
            </button>
          </div>
        </div>
      )}

      {/* Container Form Modal */}
      {showForm && settings && (
        <ContainerForm
          onSubmit={handleCreateContainer}
          onCancel={() => setShowForm(false)}
          availableDevices={settings.devices}
        />
      )}
    </div>
  );
}
