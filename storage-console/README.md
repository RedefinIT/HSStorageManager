# HSStorageManager Console

Modern web-based console for managing HSStorageManager - a software-defined object storage server.

## Features

- 📊 **Dashboard** - Real-time monitoring and statistics
- 📦 **Container Management** - Create, view, and manage storage containers
- 💾 **Device Management** - Configure storage devices (HDD, SSD, Google Drive)
- ☁️ **Google Drive Setup** - Easy wizard for cloud storage configuration
- 📁 **File Browser** - Upload, download, and organize files
- ⚙️ **Settings** - System configuration and preferences

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- HSStorageManager API running on `http://localhost:3040`

### Installation

```bash
cd storage-console
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Configuration

### Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3040/rest
```

### API Proxy

The console uses Next.js rewrites to proxy API requests to the HSStorageManager backend.
This avoids CORS issues during development.

## Architecture

```
storage-console/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Dashboard page
│   │   ├── containers/         # Container management
│   │   ├── devices/            # Device management
│   │   ├── files/              # File browser
│   │   ├── google-drive/       # Google Drive setup
│   │   └── settings/           # System settings
│   ├── components/             # Reusable React components
│   └── lib/                    # Utilities and API client
│       ├── api.ts              # HSStorageManager API client
│       └── utils.ts            # Helper functions
├── public/                     # Static assets
└── package.json
```

## Usage

### Dashboard

View system overview, storage usage, and recent activity.

### Containers

- Create new containers (buckets)
- View existing containers
- Configure container policies
- Assign OSDs to containers

### Devices

- Add new storage devices
- Configure local HDDs, SSDs
- Set up Google Drive integration
- Monitor device status

### Files

- Upload files to containers
- Browse files by container
- Download files
- Move files between containers
- Update file metadata

### Google Drive

- Step-by-step setup wizard
- Service account configuration
- OAuth2 setup
- Test connectivity

## API Integration

The console communicates with HSStorageManager via REST API:

```typescript
import api from '@/lib/api';

// Upload file
const result = await api.uploadFile(file, {
  category: 'photos',
  directory: '/2025'
});

// Query files
const files = await api.queryObjects('media1', {
  match: { category: 'photos' }
});

// Get system settings
const settings = await api.getSettings();
```

## Development

### Adding New Pages

1. Create page directory: `src/app/new-page/`
2. Add `page.tsx` in the directory
3. Update navigation in `src/components/Navigation.tsx`

### Adding API Endpoints

Update `src/lib/api.ts` with new methods following the TypeScript interfaces.

### Styling

Uses Tailwind CSS with a custom design system. Colors and styles are defined in `src/app/globals.css`.

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Icons**: Lucide React

## Deployment

### Vercel (Recommended)

```bash
vercel --prod
```

### Docker

```bash
docker build -t hsstorage-console .
docker run -p 3000:3000 hsstorage-console
```

### Environment Variables for Production

```bash
NEXT_PUBLIC_API_URL=https://your-storage-api.com/rest
```

## Security

⚠️ **Important**: This console should only be deployed on trusted networks or behind authentication.

Recommended security measures:
- Deploy behind VPN or firewall
- Use HTTPS in production
- Implement authentication (NextAuth.js recommended)
- Set up CORS properly on the API server

## Troubleshooting

### Cannot connect to API

- Verify HSStorageManager is running on port 3040
- Check `NEXT_PUBLIC_API_URL` environment variable
- Ensure CORS is enabled on the API server

### Build errors

```bash
rm -rf .next node_modules
npm install
npm run build
```

### TypeScript errors

```bash
npm run lint
```

## License

Same as HSStorageManager project.

## Contributing

See main project [CONTRIBUTING.md](../CONTRIBUTING.md)

## Support

- Documentation: [HSStorageManager ARCHITECTURE.md](../ARCHITECTURE.md)
- Issues: [GitHub Issues](https://github.com/RedefinIT/HSStorageManager/issues)

---

**Part of the HSStorageManager project**
