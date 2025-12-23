# HSStorageManager

[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> Software-defined object storage server for HomeServer environments

HSStorageManager is a flexible, RAID-free storage solution that treats files as objects and replicates them across different storage device types (SSD + HDD + Cloud) without requiring matching hardware.

## ✨ Key Features

- 🗄️ **Object-Based Storage** - Files become objects with UUIDs and rich metadata
- 🔄 **Smart Replication** - Mix SSDs, HDDs, and cloud storage without RAID constraints
- 📊 **3-Tier Architecture** - Cache (Tier-0), Primary (Tier-1), Secondary (Tier-2)
- 🔌 **OSD Abstraction** - Unified interface for local drives and cloud storage
- 🖼️ **Auto Thumbnails** - Generated for images and PDFs with intelligent caching
- 🔍 **Full-Text Search** - ZincSearch integration for fast metadata queries
- 📦 **Container System** - Logical grouping with flexible storage policies
- 🌐 **RESTful API** - Complete HTTP API for all operations

## 🚀 Quick Start

### Prerequisites

- Node.js >= 14.0.0
- ZincSearch or Elasticsearch

### Installation

```bash
# Clone the repository
git clone https://github.com/RedefinIT/HSStorageManager.git
cd HSStorageManager

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings
```

### Start ZincSearch

```bash
docker run -d -p 4080:4080 \
  -e ZINC_FIRST_ADMIN_USER=admin \
  -e ZINC_FIRST_ADMIN_PASSWORD=Complexpass#123 \
  public.ecr.aws/zinclabs/zincsearch:latest
```

### Start HSStorageManager

```bash
node server.js
# Server starts on http://localhost:3040
```

### Test Upload

```bash
# Upload a file
curl -X POST \
  -F "file=@photo.jpg" \
  "http://localhost:3040/rest/upload?context={\"category\":\"photos\"}"

# Response: {"FileID": "a1b2c3d4-e5f6-..."}

# Download the file
curl "http://localhost:3040/rest/file/staging/{FileID}" -o downloaded.jpg

# Get thumbnail
curl "http://localhost:3040/rest/file/staging/{FileID}?size=small" -o thumb.jpg
```

## 📖 Documentation

- **[Full Architecture Guide](ARCHITECTURE.md)** - Complete system design and implementation details
- **[API Documentation](swagger.yaml)** - OpenAPI/Swagger specification
- **[Refactoring Notes](REFACTORING_NOTES.md)** - ZincSearch migration and code improvements

## 🏗️ Architecture Overview

```
Client Request
     ↓
Express Server (port 3040)
     ↓
HStorageManager (Facade)
     ↓
StorageMain (Business Logic)
     ↓
┌────────────┬──────────────┬────────────┐
│    OSD     │  ZincSearch  │ Thumbnails │
│ (Storage)  │  (Indexing)  │ (Generator)│
└────────────┴──────────────┴────────────┘
     ↓
Physical Storage (SSD/HDD/Cloud)
```

## 💾 Storage Tiers

| Tier | Purpose | Device Type | Example |
|------|---------|-------------|---------|
| **Tier-0** | Cache | SSD | Thumbnails, hot data |
| **Tier-1** | Primary | SSD/Fast HDD | Active files, recent uploads |
| **Tier-2** | Archive | Large HDD/Cloud | Old files, backups |

### Why No RAID?

```
Traditional RAID:  2x 1TB HDDs (same type, same size)
HSStorageManager:  1x 1TB SSD (primary) + 1x 2TB HDD (secondary)

Benefits:
✅ Mix different device types and capacities
✅ Better cost efficiency (SSD for hot, HDD for cold)
✅ Simpler failure recovery
✅ Scale independently
```

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/rest/upload` | POST | Upload files (multipart or REST) |
| `/rest/file/:bucket/:id` | GET | Download file or thumbnail |
| `/rest/meta/:bucket/:id` | GET | Get file metadata |
| `/rest/objects` | POST | Query objects in container |
| `/rest/bulkmove` | POST | Move files between containers |
| `/rest/bulkupdate` | POST | Update metadata in bulk |
| `/rest/settings` | POST | Get system configuration |

See [swagger.yaml](swagger.yaml) for complete API reference.

## 📦 Storage Containers

Pre-configured containers for different use cases:

- **staging** - Temporary upload area (SSD)
- **media1** - Active media files (HDD)
- **media-old** - Archived media (Cloud/HDD)
- **docs** - Active documents (HDD)
- **docs-old** - Archived documents (HDD)
- **thumbnails** - Generated thumbnails (SSD)
- **system** - System files (HDD)
- **system-cache** - System cache (SSD)
- **backup** - Backup storage (USB/NFS)

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Search Engine
SEARCH_ENGINE=zincsearch
ZINC_URL=http://localhost:4080
ZINC_USER=admin
ZINC_PASSWORD=Complexpass#123

# Legacy Elasticsearch (if needed)
ES_PORT=9200
```

### Storage Devices (src/config/objectstoredevices.json)

```json
{
  "storagedevices": [
    {
      "name": "localhdd1",
      "device-type": "localHDD",
      "path": "/mnt/storage/hdd1"
    },
    {
      "name": "localsdd1",
      "device-type": "localSDD",
      "path": "/mnt/storage/ssd1"
    }
  ]
}
```

### Containers (src/config/objectstorecontainers.json)

```json
{
  "storagecontainers": [
    {
      "name": "media1",
      "osds": ["localhdd1", "localhdd2"],
      "basepath": "/media1",
      "containertype": "media"
    }
  ]
}
```

## 🖼️ Thumbnail Generation

Automatic thumbnail generation for:
- **Images** (JPEG, PNG, WebP, etc.) - 200px width using Sharp
- **PDFs** - First page rendering (planned)

**Two-level caching:**
1. In-memory hashtable (fast)
2. Persistent SSD cache (survives restarts)

```bash
# Request thumbnail
GET /rest/file/media1/{id}?size=small
```

## 🔍 Search & Indexing

ZincSearch integration provides:
- Fast metadata queries
- Full-text search on filenames
- Aggregations (group by category, date)
- Container-specific indices

**Query example:**
```bash
curl -X POST http://localhost:3040/rest/objects \
  -H "Content-Type: application/json" \
  -d '{
    "params": {"bucket": "media1"},
    "query": {
      "match": {"category": "vacation"}
    }
  }'
```

## 🔐 Security Note

⚠️ **This is a HomeServer implementation**. Not recommended for production internet-facing deployments without:
- Authentication/Authorization
- HTTPS/TLS
- Input validation
- Rate limiting
- CORS restrictions

See [ARCHITECTURE.md](ARCHITECTURE.md#security-considerations) for hardening recommendations.

## 🛠️ Development

### Project Structure

```
HSStorageManager/
├── src/
│   ├── HStorageManager.js           # Facade API
│   ├── elasticsearch/
│   │   ├── esclient.js              # ZincSearch client
│   │   └── esIndicesConfig.js       # Index schemas
│   ├── storage/
│   │   ├── storagemain.js           # Core logic (736 lines)
│   │   └── osd/
│   │       ├── localstorage.js      # HDD implementation
│   │       └── localSDD.js          # SSD implementation
│   ├── thumbnail/
│   │   └── HSThumbnails.js          # Thumbnail generator
│   └── config/
│       ├── objectstorecontainers.json
│       └── objectstoredevices.json
├── server.js                        # Express server
└── package.json
```

### Adding a New OSD Type

See the [Developer Guide](ARCHITECTURE.md#adding-a-new-osd-type) for step-by-step instructions.

### Running Tests

```bash
# Install test dependencies
npm install --save-dev mocha chai

# Run tests (when implemented)
npm test
```

## 📊 Performance

- **Streaming architecture** - No memory buffering for large files
- **Smart caching** - In-memory + persistent thumbnail cache
- **Load balancing** - Random OSD selection across devices
- **Index sharding** - Container-specific indices for faster queries
- **ZincSearch** - ~60% less memory than Elasticsearch

## 🗺️ Roadmap

- [ ] Cloud OSD implementations (Google Drive, AWS S3, Azure)
- [ ] Authentication & authorization
- [ ] Web UI for file management
- [ ] Advanced metadata extraction (EXIF, video, audio)
- [ ] Duplicate detection
- [ ] Lifecycle policies (auto-archive, retention)
- [ ] Monitoring dashboard
- [ ] Multi-server distributed storage

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Govind** - Original author
- **Contributors** - See [CONTRIBUTORS.md](CONTRIBUTORS.md)

## 🙏 Acknowledgments

- [ZincSearch](https://github.com/zinclabs/zincsearch) - Lightweight search engine
- [Sharp](https://github.com/lovell/sharp) - High-performance image processing
- [Express](https://expressjs.com/) - Web framework
- Node.js community

## 📧 Support

- **Documentation**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **API Reference**: [swagger.yaml](swagger.yaml)
- **Issues**: [GitHub Issues](https://github.com/RedefinIT/HSStorageManager/issues)

---

**Built with ❤️ for HomeServer environments**
