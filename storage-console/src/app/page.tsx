'use client';

import { useEffect, useState } from 'react';
import api, { SystemSettings } from '@/lib/api';
import { Server, Database, HardDrive, Cloud, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      setError(null);
    } catch (err) {
      setError('Failed to load system settings. Ensure HSStorageManager is running on port 3040.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="text-gray-500">Loading...</div>
    </div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex">
        <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
        <div>
          <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    </div>;
  }

  const containerCount = Object.keys(settings?.containers || {}).length;
  const deviceCount = Object.keys(settings?.devices || {}).length;
  const cloudDevices = Object.values(settings?.devices || {}).filter(
    d => d['device-type'] === 'cloud'
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your storage system
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="System Status" value="Online" icon={Server} color="green" />
        <StatCard title="Containers" value={containerCount.toString()} icon={Database} color="blue" />
        <StatCard title="Storage Devices" value={deviceCount.toString()} icon={HardDrive} color="purple" />
        <StatCard title="Cloud Devices" value={cloudDevices.toString()} icon={Cloud} color="indigo" />
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Containers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OSDs</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(settings?.containers || {}).map(([name, container]) => (
                <tr key={name}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{container.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {container.containertype}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{container.osds.join(', ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{container.basepath}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Storage Devices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protocol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(settings?.devices || {}).map(([name, device]) => (
                <tr key={name}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{device.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      device['device-type'] === 'cloud' ? 'bg-indigo-100 text-indigo-800' :
                      device['device-type'] === 'localSDD' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {device['device-type']}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{device.protocol}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">
                    {device.path || 'cloud'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-md p-3 ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-lg font-semibold text-gray-900">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
