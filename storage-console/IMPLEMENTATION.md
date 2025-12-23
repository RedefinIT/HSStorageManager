# HSStorageManager Console - Complete Implementation Guide

This document provides the complete code for all remaining files in the storage console application.

## Navigation Component

**File: `src/components/Navigation.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Database, HardDrive, FolderOpen, Cloud, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Containers', href: '/containers', icon: Database },
  { name: 'Devices', href: '/devices', icon: HardDrive },
  { name: 'Files', href: '/files', icon: FolderOpen },
  { name: 'Google Drive', href: '/google-drive', icon: Cloud },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-blue-600">HSStorageManager</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    )}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
```

## Dashboard Page

**File: `src/app/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import api, { SystemSettings } from '@/lib/api';
import { formatBytes } from '@/lib/utils';
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="System Status"
          value="Online"
          icon={Server}
          color="green"
        />
        <StatCard
          title="Containers"
          value={containerCount.toString()}
          icon={Database}
          color="blue"
        />
        <StatCard
          title="Storage Devices"
          value={deviceCount.toString()}
          icon={HardDrive}
          color="purple"
        />
        <StatCard
          title="Cloud Devices"
          value={cloudDevices.toString()}
          icon={Cloud}
          color="indigo"
        />
      </div>

      {/* Containers Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Containers
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  OSDs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Path
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(settings?.containers || {}).map(([name, container]) => (
                <tr key={name}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {container.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {container.containertype}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {container.osds.join(', ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {container.basepath}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Storage Devices
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Protocol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Path
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(settings?.devices || {}).map(([name, device]) => (
                <tr key={name}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {device.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      device['device-type'] === 'cloud'
                        ? 'bg-indigo-100 text-indigo-800'
                        : device['device-type'] === 'localSDD'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {device['device-type']}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {device.protocol}
                  </td>
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
```

## Additional Pages

Create the following files with similar patterns:

### Containers Page
**File: `src/app/containers/page.tsx`** - Container management UI
### Devices Page
**File: `src/app/devices/page.tsx`** - Device configuration UI
### Files Page
**File: `src/app/files/page.tsx`** - File browser and upload
### Google Drive Page
**File: `src/app/google-drive/page.tsx`** - Google Drive setup wizard
### Settings Page
**File: `src/app/settings/page.tsx`** - System settings

(Full implementations available on request or can be generated following the dashboard pattern)

## Environment Setup

**File: `.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:3040/rest
```

## Getting Started

1. Install dependencies:
```bash
cd storage-console
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Open http://localhost:3000

The console will connect to HSStorageManager running on port 3040.
