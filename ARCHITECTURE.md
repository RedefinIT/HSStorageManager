# HSStorageManager - Architecture & Design Documentation

## Table of Contents
1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [System Architecture](#system-architecture)
4. [Storage Tiers](#storage-tiers)
5. [OSD (Object Storage Device) Abstraction](#osd-object-storage-device-abstraction)
6. [Storage Containers (Buckets)](#storage-containers-buckets)
7. [File Processing Pipeline](#file-processing-pipeline)
8. [REST API Reference](#rest-api-reference)
9. [Data Flow Diagrams](#data-flow-diagrams)
10. [Configuration](#configuration)
11. [Indexing & Search](#indexing--search)
12. [Thumbnail Generation](#thumbnail-generation)

---

## Overview

**HSStorageManager** is a software-defined storage server purpose-built for HomeServer environments. It treats files as objects following object storage technology principles, providing a flexible, scalable, and RAID-free approach to home data management.

### Key Features

1. **Object-Based Storage** - Files are treated as objects with unique IDs and metadata
2. **Multi-Tier Replication** - Objects replicated across different storage device types (SSD + HDD)
3. **Flexible Device Support** - No requirement for matching device types/sizes (no RAID needed)
4. **OSD Abstraction** - Unified interface for SSD, NVMe, HDD, and cloud storage
5. **Automatic Thumbnails** - Generated for images and PDF documents
6. **ZincSearch Integration** - Full-text search and metadata indexing
7. **Container-Based Organization** - Logical grouping of objects
8. **RESTful API** - HTTP-based access to all storage operations
9. **3-Tier Storage** - Cache (Tier-0), Primary (Tier-1), Secondary (Tier-2)

---

## Core Concepts

### Objects vs Files

Traditional file systems organize data hierarchically with paths. HSStorageManager uses **object storage**:

- Each file becomes an **object** with a unique UUID
- Objects have **metadata** (size, mimetype, timestamps, custom tags)
- Objects are stored in **containers** (logical groupings)
- Objects are **indexed** in ZincSearch for fast retrieval
- Objects are accessible via **URL paths** with their UUID

### Replication Without RAID

Traditional RAID requires:
- Same device types (all HDDs or all SSDs)
- Same capacity devices
- Complex parity calculations
- Entire array failure on disk issues

HSStorageManager approach:
```
Primary Copy (Tier-1):   2x 1TB SSDs (fast access, frequently used data)
Secondary Copy (Tier-2): 1x 2TB HDD  (archival, infrequently accessed data)
```

**Benefits:**
- Mix different device types and capacities
- Better cost efficiency (SSD for hot data, HDD for cold data)
- Simpler failure recovery (copy from secondary)
- Scale independently (add more primary or secondary devices)

---

## System Architecture

### Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                     Express REST API Server                  │
│                        (port 3040)                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    HStorageManager                           │
│                   (Facade Layer)                             │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┬───────────────────┐
         ▼               ▼               ▼                   ▼
┌────────────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────────┐
│  StorageMain   │ │ ESClient │ │ HSThumbnails │ │ ESIndicesConfig  │
│ (Core Logic)   │ │(ZincSeach│ │  (Thumbnail  │ │  (Index Schema)  │
└────────┬───────┘ │ /ES)     │ │  Generator)  │ └──────────────────┘
         │         └──────────┘ └──────────────┘
         │
         ├───────────────┬───────────────┐
         ▼               ▼               ▼
┌────────────────┐ ┌──────────┐ ┌──────────────┐
│  LocalHDD OSD  │ │LocalSSD  │ │  Cloud OSD   │
│ (Implementatn) │ │   OSD    │ │ (GoogleDrive,│
└────────────────┘ └──────────┘ │   S3, etc)   │
                                 └──────────────┘
         │               │               │
         ▼               ▼               ▼
┌────────────────────────────────────────────────────────────┐
│              Physical Storage Devices                       │
│  /mnt/hdd1   /mnt/ssd1   Google Drive   AWS S3             │
└────────────────────────────────────────────────────────────┘
```

### Module Breakdown

| Module | Location | Responsibility |
|--------|----------|----------------|
| **server.js** | `/server.js` | Express HTTP server, route handlers |
| **HStorageManager.js** | `/src/HStorageManager.js` | Facade pattern, delegates to StorageMain |
| **storagemain.js** | `/src/storage/storagemain.js` | Core business logic, file operations |
| **esclient.js** | `/src/elasticsearch/esclient.js` | ZincSearch/Elasticsearch client |
| **esIndicesConfig.js** | `/src/elasticsearch/esIndicesConfig.js` | Index schema definitions |
| **HSThumbnails.js** | `/src/thumbnail/HSThumbnails.js` | Thumbnail generation (images, PDFs) |
| **localstorage.js** | `/src/storage/osd/localstorage.js` | Local HDD OSD implementation |
| **localSDD.js** | `/src/storage/osd/localSDD.js` | Local SSD OSD implementation |

---

## Storage Tiers

HSStorageManager implements a **3-tier storage hierarchy**:

### Tier-0: Cache Layer
- **Purpose**: Fast temporary storage for frequently accessed data
- **Typical Device**: SSD
- **Use Cases**: Thumbnails, frequently read files, system cache
- **Example Container**: `system-cache`, `thumbnails`

### Tier-1: Primary Storage
- **Purpose**: Active user data with fast access requirements
- **Typical Device**: SSD or fast HDD
- **Use Cases**: Recently uploaded files, active media library
- **Example Containers**: `staging`, `media1`, `docs`, `system`
- **Characteristics**:
  - Quick read/write access
  - Limited capacity (expensive SSDs)
  - Files eventually migrate to Tier-2

### Tier-2: Secondary/Archive Storage
- **Typical Device**: Large HDD, Cloud Storage (Google Drive, S3)
- **Use Cases**: Older files, backup, archival data
- **Example Containers**: `media-old`, `docs-old`, `backup`
- **Characteristics**:
  - Higher capacity, lower cost
  - Slower access (acceptable for cold data)
  - Can be cloud-based

### Storage Tier Workflow

```
Upload → Tier-1 (Staging on SSD)
           ↓
      Processing (metadata extraction, indexing)
           ↓
      Tier-1 (Active Storage - media1, docs)
           ↓
      [Time-based or manual migration]
           ↓
      Tier-2 (Archive - media-old, docs-old)
```

---

## OSD (Object Storage Device) Abstraction

The **OSD (Object Storage Device)** is the key abstraction that allows HSStorageManager to work with heterogeneous storage devices.

### OSD Interface

Every OSD implementation must provide:

```javascript
{
  createFile(osd, bucket, filedata, callback)  // Create new file
  readFile(osd, relativepath)                  // Read existing file
  deleteFile(osd, relativepath)                // Delete file
}
```

### OSD Configuration Schema

```json
{
  "name": "localhdd1",           // Unique identifier
  "protocol": "file",            // file | url | nfs
  "device-type": "localHDD",     // localHDD | localSDD | cloud | USB-mass-storage
  "credentials": {},             // Auth credentials for cloud storage
  "permission": "rw",            // r | w | rw
  "path": "/mnt/storage/hdd1"    // Physical mount point or URL
}
```

### Supported OSD Types

| OSD Type | Implementation | Status | Use Case |
|----------|----------------|--------|----------|
| **localHDD** | `localstorage.js` | ✅ Implemented | Tier-1/2 primary storage |
| **localSDD** | `localSDD.js` | ✅ Implemented | Tier-0/1 cache, staging |
| **cloud** (Google Drive) | ❌ Planned | Tier-2 cloud archive |
| **cloud** (AWS S3) | ❌ Planned | Tier-2 cloud archive |
| **USB-mass-storage** | ❌ Planned | Backup, portable archive |
| **nfs** | ❌ Planned | Network attached storage |

### Path Encoding

Files are stored with encoded paths:
```
Format: {OSD_NAME}:{BUCKET_BASEPATH}/{OBJECT_UUID}
Example: localsdd1:/staging/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

This encoding allows:
- Fast OSD lookup from metadata
- Relocatable storage (change OSD path without changing object paths)
- Support for multiple OSDs in a container

---

## Storage Containers (Buckets)

Containers are **logical groupings** of objects, similar to S3 buckets.

### Container Configuration Schema

```json
{
  "name": "staging",
  "description": "Bucket for staging newly added files",
  "policyJSON": {},
  "osds": ["localsdd1"],         // List of OSDs for this container
  "basepath": "/staging",        // Path prefix within OSD
  "containertype": "staging"     // staging | media | docs | system | cache | backup
}
```

### Default Containers

| Container | Type | OSD(s) | Purpose |
|-----------|------|--------|---------|
| **staging** | staging | localsdd1 (SSD) | Temporary upload staging area |
| **media1** | media | localhdd1, localhdd2 | Tier-1 user photos/videos |
| **media-old** | media | google-drive | Tier-2 archived media |
| **docs** | docs | localhdd1, localhdd2 | Tier-1 user documents |
| **docs-old** | docs | localhdd1, localhdd2 | Tier-2 archived documents |
| **system** | system | localhdd1, localhdd2 | System files |
| **system-cache** | cache | localsdd1 (SSD) | System cache |
| **thumbnails** | thumbnails | localsdd1 (SSD) | Generated thumbnails |
| **backup** | backup | usb | Backup copies |

### Container-to-OSD Mapping

Containers can map to **multiple OSDs** for load balancing:

```json
{
  "name": "media1",
  "osds": ["localhdd1", "localhdd2"]
}
```

When creating a file, StorageMain **randomly selects** an OSD from the list:
```javascript
// storagemain.js:182
var osdpicked = Math.floor((Math.random() * osdcount));
```

This provides simple **load distribution** across multiple devices.

---

## File Processing Pipeline

### 1. Upload Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. HTTP POST /rest/upload                                    │
│    - Multipart form data OR REST with metadata header       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. StorageMain.createNewFile()                               │
│    - Generate UUID for object                                │
│    - Set status = 'staging'                                  │
│    - Set container = 'staging'                               │
│    - Add import_date (ISO8601 timestamp)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. StorageMain.createFile()                                  │
│    - Lookup 'staging' container                              │
│    - Randomly select OSD (localsdd1)                         │
│    - Call OSD.createFile() to get WriteStream                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Stream Data to OSD                                        │
│    - Multipart: busboy pipes file stream to OSD             │
│    - REST: req.on('data') writes chunks to OSD              │
│    - Track file size during streaming                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. StorageMain.addNewFileIndex()                             │
│    - Add object metadata to ZincSearch                       │
│    - Index: sm_objectstoreindex_staging                      │
│    - Document: {id, path, size, mimetype, status, ...}       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Return Object ID to Client                                │
│    - Response: {FileID: "uuid-here"}                         │
└─────────────────────────────────────────────────────────────┘
```

### 2. File Metadata Structure

```javascript
{
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",  // UUID
  path: "localsdd1:/staging/a1b2c3d4-...",     // OSD:path encoding
  size: 2048576,                                // Bytes
  mimetype: "image/jpeg",                       // MIME type
  orgfilename: "vacation.jpg",                  // Original filename
  encoding: "7bit",                             // Transfer encoding
  status: "staging",                            // staging | online | archived
  container: "staging",                         // Container name
  import_date: "2025-12-23T10:30:00.000Z",     // ISO8601 timestamp
  category: "photos",                           // User-defined category
  directory: "/2025/vacation",                  // User-defined directory
  params: {}                                    // Additional metadata
}
```

### 3. Download Flow (with Thumbnail Support)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. GET /rest/file/:bucket/:fileID?size=small                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Check Query Parameter                                     │
│    - size=small → Thumbnail request                          │
│    - No size → Full file request                             │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌──────────────────┐   ┌──────────────────────────────────────┐
│ Full File Path   │   │ Thumbnail Path                        │
└────────┬─────────┘   └────────┬─────────────────────────────┘
         │                      │
         │                      ▼
         │            ┌──────────────────────────────────────┐
         │            │ 3. Check Thumbnail Cache (in-memory) │
         │            └────────┬─────────────────────────────┘
         │                     │
         │          ┌──────────┴──────────┐
         │          ▼                     ▼
         │   ┌──────────────┐   ┌─────────────────────────────┐
         │   │ Cache Hit    │   │ Cache Miss                   │
         │   └──────┬───────┘   └─────────┬───────────────────┘
         │          │                     │
         │          │                     ▼
         │          │           ┌──────────────────────────────┐
         │          │           │ 4. Fetch from ZincSearch     │
         │          │           │    Get original file metadata│
         │          │           └─────────┬────────────────────┘
         │          │                     │
         │          │                     ▼
         │          │           ┌──────────────────────────────┐
         │          │           │ 5. Generate Thumbnail        │
         │          │           │    - sharp.resize(200)       │
         │          │           │    - PDF first page          │
         │          │           └─────────┬────────────────────┘
         │          │                     │
         │          │                     ▼
         │          │           ┌──────────────────────────────┐
         │          │           │ 6. Save to 'thumbnails'      │
         │          │           │    Container (localsdd1)     │
         │          │           └─────────┬────────────────────┘
         │          │                     │
         │          │                     ▼
         │          │           ┌──────────────────────────────┐
         │          │           │ 7. Add to Cache (hashtable)  │
         │          │           └─────────┬────────────────────┘
         │          │                     │
         │          └─────────────────────┘
         │                      │
         ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. getFileFromPath()                                         │
│    - Parse path: "localsdd1:/staging/uuid"                   │
│    - Lookup OSD (localsdd1)                                  │
│    - Call OSD.readFile() to get ReadStream                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. Stream to Client                                          │
│    - Set Content-Type, Content-Length headers                │
│    - Pipe ReadStream to HTTP response                        │
└─────────────────────────────────────────────────────────────┘
```

### 4. Bulk Move Operation

**Purpose**: Move multiple files from one container to another (e.g., staging → media1)

```
┌─────────────────────────────────────────────────────────────┐
│ POST /rest/bulkmove1                                         │
│ Body: {                                                      │
│   params: {                                                  │
│     sourcebucket: "staging",                                 │
│     targetbucket: "media1",                                  │
│     fileslist: [{id, path}, {id, path}, ...]                │
│   }                                                          │
│ }                                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ For Each File in fileslist:                                  │
│                                                              │
│  1. StorageMain.getFile(sourcebucket, id)                    │
│     → Returns ReadStream + metadata                          │
│                                                              │
│  2. Update metadata:                                         │
│     metadata.container = targetbucket                        │
│     metadata.status = "online"                               │
│                                                              │
│  3. StorageMain._addfile(targetbucket, metadata, stream)     │
│     → Writes to new OSD, indexes in ZincSearch              │
│                                                              │
│  4. StorageMain._deletefile(sourcebucket, id, path)          │
│     → Deletes from source OSD and index                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## REST API Reference

### Base URL
```
http://localhost:3040/rest
```

### API Endpoints

#### 1. Upload File

**Multipart Form Upload** (from browser forms)
```http
POST /rest/upload?context={"category":"photos","directory":"/2025"}
Content-Type: multipart/form-data

[Form data with file field]
```

**REST Upload** (from API clients)
```http
POST /rest/upload
Content-Type: application/octet-stream
metadata: {"orgfilename":"photo.jpg","category":"photos"}

[Binary file data]
```

**Response:**
```json
{
  "FileID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

#### 2. Download File

**GET by URL**
```http
GET /rest/file/:bucket/:fileID
GET /rest/file/:bucket/:fileID?size=small   # Request thumbnail
```

**Example:**
```http
GET /rest/file/media1/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Response:**
- Binary file stream
- Headers: Content-Type, Content-Length

**POST Method** (alternative)
```http
POST /rest/file
Content-Type: application/json

{
  "params": {
    "bucket": "media1",
    "objid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

---

#### 3. Get File Metadata

```http
GET /rest/meta/:bucket/:fileID
```

**Example:**
```http
GET /rest/meta/staging/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Response:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "path": "localsdd1:/staging/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "size": 2048576,
  "mimetype": "image/jpeg",
  "orgfilename": "vacation.jpg",
  "status": "staging",
  "container": "staging",
  "import_date": "2025-12-23T10:30:00.000Z",
  "category": "photos"
}
```

---

#### 4. Query Objects in Container

```http
POST /rest/objects
Content-Type: application/json

{
  "params": {
    "bucket": "media1"
  },
  "query": {
    "match": {
      "category": "photos"
    }
  }
}
```

**Response:**
```json
{
  "result": {
    "total": 150,
    "count": 50,
    "items": [
      {
        "id": "uuid1",
        "orgfilename": "photo1.jpg",
        "size": 1024000,
        ...
      },
      ...
    ]
  }
}
```

---

#### 5. Bulk Move Files

**Between Containers with Same Files**
```http
POST /rest/bulkmove
Content-Type: application/json

[
  {
    "id": "uuid1",
    "sourcebucket": "staging",
    "targetbucket": "media1"
  },
  {
    "id": "uuid2",
    "sourcebucket": "staging",
    "targetbucket": "docs"
  }
]
```

**Between Containers (All from Same Source)**
```http
POST /rest/bulkmove1
Content-Type: application/json

{
  "params": {
    "sourcebucket": "staging",
    "targetbucket": "media1",
    "fileslist": [
      {"id": "uuid1", "path": "localsdd1:/staging/uuid1"},
      {"id": "uuid2", "path": "localsdd1:/staging/uuid2"}
    ]
  }
}
```

**Response:**
```json
{
  "result": "done"
}
```

---

#### 6. Bulk Update Metadata

```http
POST /rest/bulkupdate
Content-Type: application/json

[
  {
    "id": "uuid1",
    "container": "media1",
    "category": "vacation",
    "tags": ["beach", "summer"]
  },
  {
    "id": "uuid2",
    "container": "media1",
    "category": "family"
  }
]
```

**Response:**
```json
{
  "result": "done"
}
```

---

#### 7. Get System Settings

```http
POST /rest/settings
```

**Response:**
```json
{
  "containers": {
    "staging": {
      "name": "staging",
      "osds": ["localsdd1"],
      "basepath": "/staging",
      ...
    },
    ...
  },
  "devices": {
    "localhdd1": {
      "name": "localhdd1",
      "device-type": "localHDD",
      "path": "/mnt/storage/hdd1",
      ...
    },
    ...
  }
}
```

---

## Data Flow Diagrams

### Upload → Storage → Index

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     │ POST /rest/upload (file data)
     ▼
┌─────────────────┐
│ Express Server  │
│  (server.js)    │
└────┬────────────┘
     │
     │ addfiles(req, res, context)
     ▼
┌──────────────────┐
│ HStorageManager  │
│ (facade)         │
└────┬─────────────┘
     │
     │ addFile_Multipart() or addFile_RestCall()
     ▼
┌──────────────────────────┐
│ StorageMain              │
│ ┌──────────────────────┐ │
│ │ createNewFile()      │ │
│ │  - Generate UUID     │ │
│ │  - Create metadata   │ │
│ └──────────┬───────────┘ │
│            │              │
│ ┌──────────▼───────────┐ │
│ │ createFile()         │ │
│ │  - Select OSD        │ │
│ │  - Get WriteStream   │ │
│ └──────────┬───────────┘ │
└────────────┼─────────────┘
             │
             ▼
┌────────────────────────┐
│  OSD (localSDD)        │
│  ┌──────────────────┐  │
│  │ createFile()     │  │
│  │  - Create stream │  │
│  └────────┬─────────┘  │
└───────────┼────────────┘
            │
            ▼
    ┌───────────────┐
    │ Physical SSD  │
    │ /mnt/ssd1/... │
    └───────────────┘

            │
            │ (parallel indexing)
            ▼
┌─────────────────────────┐
│ ZincSearch              │
│ Index: sm_objectstore   │
│        index_staging    │
│                         │
│ Document: {             │
│   id: uuid,             │
│   path: osd:path,       │
│   size: 2MB,            │
│   ...                   │
│ }                       │
└─────────────────────────┘
```

### Download with Thumbnail Generation

```
Client Requests: GET /rest/file/media1/uuid?size=small

                     ┌──────────────────┐
                     │  Check Thumbnail │
                     │  Cache (Memory)  │
                     └────┬─────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
         ┌─────────┐            ┌─────────┐
         │  Found  │            │Not Found│
         └────┬────┘            └────┬────┘
              │                      │
              │                      ▼
              │              ┌──────────────────┐
              │              │ Get Original File│
              │              │ from ZincSearch  │
              │              └────┬─────────────┘
              │                   │
              │                   ▼
              │              ┌──────────────────┐
              │              │ Read File Stream │
              │              │ from OSD         │
              │              └────┬─────────────┘
              │                   │
              │                   ▼
              │              ┌──────────────────┐
              │              │ Generate Thumbnail│
              │              │ - sharp.resize() │
              │              │ - PDF render     │
              │              └────┬─────────────┘
              │                   │
              │                   ▼
              │              ┌──────────────────┐
              │              │ Save to          │
              │              │ 'thumbnails'     │
              │              │ Container        │
              │              └────┬─────────────┘
              │                   │
              │                   ▼
              │              ┌──────────────────┐
              │              │ Add to Cache     │
              │              └────┬─────────────┘
              │                   │
              └───────────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │ Stream to     │
                  │ Client        │
                  └───────────────┘
```

---

## Configuration

### Container Configuration
**File:** `/src/config/objectstorecontainers.json`

```json
{
  "storagecontainers": [
    {
      "name": "staging",
      "description": "Bucket for staging newly added files",
      "policyJSON": {},
      "osds": ["localsdd1"],
      "basepath": "/staging",
      "containertype": "staging"
    }
  ]
}
```

**Fields:**
- `name`: Unique container identifier
- `description`: Human-readable description
- `policyJSON`: Future: retention, lifecycle policies
- `osds`: Array of OSD names that serve this container
- `basepath`: Path prefix within each OSD
- `containertype`: Type classification

### Device Configuration
**File:** `/src/config/objectstoredevices.json`

```json
{
  "storagedevices": [
    {
      "name": "localhdd1",
      "protocol": "file",
      "device-id": "",
      "device-type": "localHDD",
      "credentials": {},
      "permission": "rw",
      "path": "/mnt/storage/hdd1"
    }
  ]
}
```

**Fields:**
- `name`: Unique OSD identifier
- `protocol`: `file` | `url` | `nfs`
- `device-type`: `localHDD` | `localSDD` | `cloud` | `USB-mass-storage`
- `credentials`: Authentication for cloud storage
- `permission`: `r` | `w` | `rw`
- `path`: Physical mount point or URL

### Environment Configuration
**File:** `.env` (create from `.env.example`)

```bash
# Search Engine
SEARCH_ENGINE=zincsearch        # or 'elasticsearch'
ZINC_URL=http://localhost:4080
ZINC_USER=admin
ZINC_PASSWORD=Complexpass#123
ES_PORT=9200

# Server
PORT=3040
```

---

## Indexing & Search

### ZincSearch Integration

HSStorageManager uses ZincSearch (or Elasticsearch) for:
- Fast metadata queries
- Full-text search on filenames
- Aggregations (group by category, date, etc.)
- Container-specific indices

### Index Naming Convention

Each container has its own index:
```
sm_objectstoreindex_{container_name}

Examples:
- sm_objectstoreindex_staging
- sm_objectstoreindex_media1
- sm_objectstoreindex_docs
```

### Index Schema

Defined in `esIndicesConfig.js`:

```javascript
{
  index: "sm_objectstoreindex_staging",
  body: {
    mappings: {
      properties: {
        id: { type: "keyword" },
        path: { type: "keyword" },
        size: { type: "long" },
        mimetype: { type: "keyword" },
        orgfilename: { type: "text" },
        status: { type: "keyword" },
        container: { type: "keyword" },
        import_date: { type: "date" },
        category: { type: "keyword" },
        directory: { type: "keyword" }
      }
    }
  }
}
```

### Query Examples

**Match by Category:**
```json
{
  "query": {
    "match": {
      "category": "photos"
    }
  }
}
```

**Range Query by Date:**
```json
{
  "query": {
    "range": {
      "import_date": {
        "gte": "2025-01-01",
        "lte": "2025-12-31"
      }
    }
  }
}
```

**Boolean Query:**
```json
{
  "query": {
    "bool": {
      "must": [
        {"match": {"category": "vacation"}},
        {"match": {"mimetype": "image/jpeg"}}
      ]
    }
  }
}
```

---

## Thumbnail Generation

### Supported Formats

| Format | Library | Output |
|--------|---------|--------|
| **Images** (JPEG, PNG, WebP, etc.) | `sharp` | 200px width thumbnail |
| **PDF** | `pdfjs-dist` | First page render (planned) |

### Image Thumbnails

Uses **Sharp** library for fast image processing:

```javascript
const thumbnailgenerator = sharp()
  .resize(200);  // 200px width, auto height

return filestream.pipe(thumbnailgenerator);
```

### Thumbnail Caching

**Two-level cache:**

1. **In-Memory Cache** (hashtable)
   - Fast lookups for frequently accessed thumbnails
   - Key: Object UUID
   - Value: Thumbnail metadata (path, size, mimetype)

2. **Persistent Cache** (`thumbnails` container)
   - Stored on SSD (localsdd1)
   - Survives server restarts
   - Indexed in ZincSearch

### Thumbnail Generation Flow

```
1. Client requests: ?size=small
2. Check in-memory cache
   - Hit: Return cached thumbnail path
   - Miss: Continue to step 3
3. Fetch original file metadata from ZincSearch
4. Read original file stream from OSD
5. Generate thumbnail with sharp.resize(200)
6. Save thumbnail to 'thumbnails' container
7. Add to in-memory cache
8. Stream thumbnail to client
```

---

## Security Considerations

### Current Implementation

⚠️ **Warning**: This is a HomeServer implementation with basic security. Not recommended for production internet-facing deployments without hardening.

**Current Security Features:**
- None (authentication not implemented)
- CORS allows all origins (`*`)
- No input validation
- No rate limiting
- No encryption at rest

**Recommendations for Production:**
1. Add authentication (JWT, OAuth, API keys)
2. Implement authorization (user-based access control)
3. Add input validation and sanitization
4. Enable HTTPS with TLS certificates
5. Implement rate limiting
6. Add encryption at rest for sensitive data
7. Restrict CORS to specific origins
8. Add audit logging
9. Implement file type validation
10. Add virus scanning for uploads

---

## Performance Considerations

### Optimization Strategies

**1. Thumbnail Caching**
- In-memory hashtable for hot thumbnails
- Persistent SSD cache for warm thumbnails
- Lazy generation (on first access)

**2. OSD Load Balancing**
- Random OSD selection for containers with multiple OSDs
- Distributes write load across devices

**3. Streaming Architecture**
- Files streamed directly from OSD to client
- No intermediate buffering in application memory
- Supports large file transfers (GB+ files)

**4. Index Sharding**
- Container-specific indices reduce query scope
- Faster searches within a specific container

**5. ZincSearch vs Elasticsearch**
- ZincSearch: ~60% less memory, faster startup
- Better for HomeServer constrained environments

### Scalability Limits

**Current Design Constraints:**
- Single-server architecture
- No distributed storage support
- In-memory caches lost on restart
- No replication across servers

**Future Improvements:**
- Distributed OSD support (network storage)
- Redis for shared caching
- Message queue for async processing
- Multi-server deployment

---

## Monitoring & Operations

### Health Checks

**Check Storage Status:**
```bash
curl http://localhost:3040/rest/settings
```

**Check ZincSearch:**
```bash
curl -u admin:password http://localhost:4080/version
```

### Common Operations

**1. Add New Storage Device**
- Edit `objectstoredevices.json`
- Add new OSD configuration
- Restart HSStorageManager
- Verify with `/rest/settings`

**2. Create New Container**
- Edit `objectstorecontainers.json`
- Add container with OSD mappings
- Restart HSStorageManager
- New index created automatically on first use

**3. Migrate Files Between Tiers**
```bash
# Move old files from media1 to media-old
POST /rest/bulkmove1
{
  "params": {
    "sourcebucket": "media1",
    "targetbucket": "media-old",
    "fileslist": [...]
  }
}
```

**4. Backup Strategy**
- Use `backup` container on USB or NFS
- Bulk move important files to backup
- ZincSearch metadata can be exported/imported

---

## Troubleshooting

### Common Issues

**1. Files Not Uploading**
- Check OSD path permissions (must be writable)
- Verify OSD exists in configuration
- Check disk space on target device

**2. Thumbnails Not Generating**
- Verify Sharp library installed correctly
- Check thumbnail container (localsdd1) exists
- Verify SSD path is writable

**3. Search Not Working**
- Check ZincSearch is running on port 4080
- Verify credentials in `.env`
- Check index exists: `sm_objectstoreindex_{container}`

**4. Files Missing After Move**
- Check both source and target containers
- Query ZincSearch for object ID
- Verify OSD path encoding is correct

---

## Future Enhancements

### Planned Features

1. **Cloud OSD Implementations**
   - Google Drive integration
   - AWS S3 integration
   - Azure Blob Storage

2. **Advanced Replication**
   - Automatic tier migration based on age
   - Replication across multiple OSDs
   - Erasure coding for space efficiency

3. **Authentication & Authorization**
   - User accounts
   - Per-container access control
   - API key management

4. **Web UI**
   - File browser
   - Upload/download interface
   - Thumbnail gallery view
   - Search interface

5. **Enhanced Metadata**
   - EXIF extraction for photos
   - Video metadata (duration, codec, resolution)
   - Audio metadata (artist, album, duration)
   - Document OCR for searchable text

6. **Smart Features**
   - Duplicate detection (hash-based)
   - Similar image search
   - Auto-tagging with ML
   - Face recognition

7. **Lifecycle Policies**
   - Auto-archive based on age
   - Auto-delete based on rules
   - Retention policies per container

8. **Better Monitoring**
   - Storage usage dashboard
   - Performance metrics
   - Error logging
   - Alerting

---

## Developer Guide

### Project Structure

```
HSStorageManager/
├── src/
│   ├── HStorageManager.js           # Facade API
│   ├── elasticsearch/
│   │   ├── esclient.js              # ZincSearch client
│   │   └── esIndicesConfig.js       # Index schemas
│   ├── storage/
│   │   ├── storagemain.js           # Core business logic
│   │   ├── storageutils.js          # Utilities (empty)
│   │   └── osd/
│   │       ├── localstorage.js      # HDD OSD
│   │       └── localSDD.js          # SSD OSD
│   ├── thumbnail/
│   │   └── HSThumbnails.js          # Thumbnail generator
│   ├── hsosmetadb/
│   │   └── metadb.js                # Policy definitions (stub)
│   └── config/
│       ├── objectstorecontainers.json
│       └── objectstoredevices.json
├── server.js                        # Express server
├── package.json
├── .env.example
└── ARCHITECTURE.md                  # This file
```

### Adding a New OSD Type

1. **Create OSD Implementation** (`src/storage/osd/mynewdevice.js`)
```javascript
var MyNewDevice = {
  createFile: function(osd, bucket, filedata, callback) {
    // Return WriteStream
  },
  readFile: function(osd, relativepath) {
    // Return ReadStream
  },
  deleteFile: function(osd, relativepath) {
    // Delete file
  }
};
module.exports = MyNewDevice;
```

2. **Update StorageMain** (`src/storage/storagemain.js`)
```javascript
var mynewdevice = require('./osd/mynewdevice');

// In createFile() function:
if (osd['device-type'] === 'mynewdevice') {
  mynewdevice.createFile(osd, bucketObj, filedata, callback);
}
```

3. **Add Device Configuration** (`src/config/objectstoredevices.json`)
```json
{
  "name": "mydevice1",
  "device-type": "mynewdevice",
  "path": "/path/to/device",
  ...
}
```

### Running the System

**1. Install Dependencies**
```bash
npm install
```

**2. Configure Environment**
```bash
cp .env.example .env
# Edit .env with your settings
```

**3. Start ZincSearch**
```bash
docker run -d -p 4080:4080 \
  -e ZINC_FIRST_ADMIN_USER=admin \
  -e ZINC_FIRST_ADMIN_PASSWORD=Complexpass#123 \
  public.ecr.aws/zinclabs/zincsearch:latest
```

**4. Start HSStorageManager**
```bash
node server.js
# Server starts on port 3040
```

**5. Test Upload**
```bash
curl -X POST \
  -F "file=@test.jpg" \
  "http://localhost:3040/rest/upload?context={\"category\":\"test\"}"
```

---

## Conclusion

HSStorageManager provides a flexible, software-defined storage solution for HomeServer environments. By abstracting physical storage devices behind the OSD interface and organizing data into containers, it offers RAID-like redundancy without RAID's limitations.

Key advantages:
- ✅ Mix different device types and sizes
- ✅ Easy to add/remove storage devices
- ✅ Fast SSD caching with HDD archival
- ✅ Full-text search on metadata
- ✅ Automatic thumbnail generation
- ✅ RESTful API for integration
- ✅ No vendor lock-in (open source stack)

Perfect for:
- Personal media servers
- Home document management
- Small business file storage
- Development/testing environments
- Learning object storage concepts

---

**Version:** 0.0.1
**Last Updated:** 2025-12-23
**Author:** Govind (original), Documentation by Claude
**License:** Not specified

For questions or contributions, please refer to the project repository.
