import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getDeviceTypeIcon(deviceType: string): string {
  switch (deviceType) {
    case 'localHDD':
      return '💿';
    case 'localSDD':
      return '⚡';
    case 'cloud':
      return '☁️';
    case 'USB-mass-storage':
      return '🔌';
    default:
      return '📦';
  }
}

export function getContainerTypeColor(containerType: string): string {
  switch (containerType) {
    case 'staging':
      return 'bg-yellow-100 text-yellow-800';
    case 'media':
      return 'bg-purple-100 text-purple-800';
    case 'docs':
      return 'bg-blue-100 text-blue-800';
    case 'system':
      return 'bg-gray-100 text-gray-800';
    case 'cache':
      return 'bg-green-100 text-green-800';
    case 'thumbnails':
      return 'bg-pink-100 text-pink-800';
    case 'backup':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'staging':
      return 'bg-yellow-100 text-yellow-800';
    case 'online':
      return 'bg-green-100 text-green-800';
    case 'archived':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
