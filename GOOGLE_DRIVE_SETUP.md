# Google Drive OSD Setup Guide

This guide explains how to configure and use Google Drive as an Object Storage Device (OSD) in HSStorageManager.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Google Cloud Setup](#google-cloud-setup)
4. [Authentication Methods](#authentication-methods)
5. [Configuration](#configuration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The Google Drive OSD allows HSStorageManager to use Google Drive as a cloud storage backend. This is ideal for:
- **Tier-2 storage** (archive, cold data)
- **Off-site backups**
- **Large capacity at low cost** (15GB free, paid plans available)
- **Automatic redundancy** (Google's infrastructure)

### Features

- ✅ Upload files to Google Drive
- ✅ Download files from Google Drive
- ✅ Delete files from Google Drive
- ✅ Automatic folder creation
- ✅ Service Account authentication (server-to-server)
- ✅ OAuth2 authentication (user-delegated access)
- ✅ Streaming uploads/downloads
- ✅ Metadata preservation

---

## Prerequisites

1. **Google Cloud Account** - Free tier available
2. **Google Drive API enabled**
3. **Service Account or OAuth2 credentials**
4. **Node.js >= 14.0.0**
5. **googleapis npm package** (installed automatically)

---

## Google Cloud Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name: `HSStorageManager` (or your choice)
4. Click **Create**

### Step 2: Enable Google Drive API

1. In the Cloud Console, navigate to **APIs & Services** → **Library**
2. Search for "Google Drive API"
3. Click **Google Drive API**
4. Click **Enable**

### Step 3: Create Credentials

#### Option A: Service Account (Recommended for Servers)

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Fill in details:
   - **Service account name**: `hsstorage-service`
   - **Service account ID**: (auto-generated)
   - **Description**: "Service account for HSStorageManager"
4. Click **Create and Continue**
5. Grant role: **Project** → **Editor** (or custom role with Drive access)
6. Click **Continue** → **Done**

7. **Create Key**:
   - Find your service account in the list
   - Click the service account email
   - Go to **Keys** tab
   - Click **Add Key** → **Create new key**
   - Select **JSON**
   - Click **Create**
   - **Save the downloaded file** (e.g., `service-account-key.json`)

⚠️ **Important**: Keep this file secure! It provides access to your Google Drive.

#### Option B: OAuth2 (For User-Delegated Access)

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Configure consent screen if prompted:
   - User Type: **External** (for personal use) or **Internal** (for organization)
   - Fill in app name, support email, etc.
   - Add scopes: `https://www.googleapis.com/auth/drive.file`
4. Back to **Create OAuth client ID**:
   - Application type: **Desktop app** or **Web application**
   - Name: `HSStorageManager`
   - For web app, add redirect URI: `http://localhost:3040/oauth2callback`
5. Click **Create**
6. **Download JSON** with client ID and secret

### Step 4: Grant Access (Service Account Only)

Since service accounts don't have their own Google Drive, you need to share a folder with them:

1. In Google Drive, create a folder: `HSStorageManager`
2. Right-click → **Share**
3. Enter the service account email (looks like `hsstorage-service@project-id.iam.gserviceaccount.com`)
4. Grant **Editor** access
5. Click **Send**

Or, the service account will create its own folder structure in its isolated Drive space.

---

## Authentication Methods

### Method 1: Service Account (Recommended)

**Best for**: Server-to-server, automated backups, production environments

**Configuration**:
```json
{
  "name": "google-drive-1",
  "protocol": "url",
  "device-type": "cloud",
  "credentials": {
    "type": "service_account",
    "project_id": "your-project-id",
    "private_key_id": "abc123...",
    "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
    "client_email": "hsstorage-service@project-id.iam.gserviceaccount.com",
    "client_id": "123456789",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
  },
  "permission": "rw",
  "path": ""
}
```

### Method 2: Service Account from File

**Best for**: Keeping credentials separate from config

**Configuration**:
```json
{
  "name": "google-drive-1",
  "protocol": "url",
  "device-type": "cloud",
  "credentials": {
    "file": "/path/to/service-account-key.json"
  },
  "permission": "rw",
  "path": ""
}
```

### Method 3: OAuth2

**Best for**: User-specific access, development, personal use

**Configuration**:
```json
{
  "name": "google-drive-1",
  "protocol": "url",
  "device-type": "cloud",
  "credentials": {
    "client_id": "your-client-id.apps.googleusercontent.com",
    "client_secret": "your-client-secret",
    "redirect_uri": "http://localhost:3040/oauth2callback",
    "refresh_token": "your-refresh-token"
  },
  "permission": "rw",
  "path": ""
}
```

**Obtaining refresh_token**: You'll need to implement an OAuth2 flow to get the refresh token. See [Google OAuth2 documentation](https://developers.google.com/identity/protocols/oauth2).

---

## Configuration

### 1. Update Device Configuration

Edit `src/config/objectstoredevices.json`:

```json
{
  "storagedevices": [
    {
      "name": "localhdd1",
      "device-type": "localHDD",
      "path": "/mnt/storage/hdd1",
      ...
    },
    {
      "name": "google-drive-1",
      "protocol": "url",
      "description": "Google Drive for tier-2 archive storage",
      "device-id": "",
      "device-type": "cloud",
      "credentials": {
        "file": "./credentials/google-drive-service-account.json"
      },
      "permission": "rw",
      "path": ""
    }
  ]
}
```

### 2. Update Container Configuration

Edit `src/config/objectstorecontainers.json` to use Google Drive for archive containers:

```json
{
  "storagecontainers": [
    {
      "name": "media-old",
      "description": "Tier-2 archived media files",
      "policyJSON": {},
      "osds": ["google-drive-1"],
      "basepath": "/media-archive",
      "containertype": "media"
    },
    {
      "name": "docs-old",
      "description": "Tier-2 archived documents",
      "policyJSON": {},
      "osds": ["google-drive-1"],
      "basepath": "/docs-archive",
      "containertype": "docs"
    }
  ]
}
```

### 3. Place Credentials File

Create a credentials directory and place your service account key:

```bash
mkdir -p credentials
cp ~/Downloads/service-account-key.json credentials/google-drive-service-account.json
chmod 600 credentials/google-drive-service-account.json
```

Update `.gitignore` to exclude credentials:
```
credentials/
*.json
!package.json
```

---

## Testing

### Test 1: Upload a File

```bash
# Upload to a container that uses Google Drive
curl -X POST \
  -F "file=@test.jpg" \
  "http://localhost:3040/rest/upload?context={\"category\":\"test\"}"

# Response: {"FileID": "a1b2c3d4-..."}
```

### Test 2: Move to Google Drive Container

```bash
# Move from staging to media-old (Google Drive)
curl -X POST http://localhost:3040/rest/bulkmove1 \
  -H "Content-Type: application/json" \
  -d '{
    "params": {
      "sourcebucket": "staging",
      "targetbucket": "media-old",
      "fileslist": [
        {"id": "a1b2c3d4-...", "path": "localsdd1:/staging/a1b2c3d4-..."}
      ]
    }
  }'
```

### Test 3: Download from Google Drive

```bash
# Download file stored in Google Drive
curl "http://localhost:3040/rest/file/media-old/{FileID}" -o downloaded.jpg
```

### Test 4: Verify in Google Drive

1. Go to [Google Drive](https://drive.google.com/)
2. If using service account, you won't see files (they're in the service account's Drive)
3. If you shared a folder with the service account, check that folder
4. You should see folders created by HSStorageManager (e.g., `media-archive`, `docs-archive`)

---

## Troubleshooting

### Error: "Google Drive credentials required"

**Problem**: No credentials provided in OSD configuration

**Solution**:
- Ensure `credentials` object is not empty in `objectstoredevices.json`
- If using file-based credentials, verify the file path is correct
- Check file permissions: `chmod 600 credentials/*.json`

### Error: "Request had insufficient authentication scopes"

**Problem**: Service account doesn't have required permissions

**Solution**:
- Ensure Google Drive API is enabled in Google Cloud Console
- Check service account has appropriate IAM role (Editor or custom with Drive access)
- Verify scope in code: `https://www.googleapis.com/auth/drive.file`

### Error: "File not found" when downloading

**Problem**: File ID not found in Google Drive

**Solution**:
- Verify file was actually uploaded (check console logs)
- Ensure OSD name matches in path encoding
- Check Google Drive folder structure
- Verify service account has access to the file

### Slow uploads/downloads

**Problem**: Network latency to Google servers

**Solution**:
- Google Drive API has rate limits (consider implementing retry logic)
- Use compression for large files before upload
- Consider using Google Cloud Storage (GCS) instead for better performance
- Implement chunked uploads for very large files (future enhancement)

### Service account can't see files

**Problem**: Service accounts have isolated Drive space

**Solution**:
- This is normal behavior
- Files uploaded by service account are only visible to that service account
- To see files: Share a folder with the service account and use that folder
- Or use the Drive API to list files programmatically

---

## Best Practices

### 1. Folder Organization

Create a clear folder structure in Google Drive:
```
HSStorageManager/
├── media-archive/
│   └── [files...]
├── docs-archive/
│   └── [files...]
└── backups/
    └── [files...]
```

### 2. Security

- ✅ Never commit credentials to Git
- ✅ Use environment variables for sensitive data
- ✅ Rotate service account keys periodically
- ✅ Use minimum required permissions (don't use full Drive access)
- ✅ Enable 2FA on Google account
- ✅ Monitor API usage in Google Cloud Console

### 3. Cost Management

- Google Drive: 15GB free, $1.99/month for 100GB
- Google Cloud Storage (GCS): Pay-as-you-go, better for large archives
- Monitor storage usage: [Google Drive Storage](https://one.google.com/storage)
- Set up billing alerts in Google Cloud Console

### 4. Performance

- **Upload**: Files are buffered in memory before upload (consider disk buffer for very large files)
- **Download**: Streaming from Google Drive to client (no buffering)
- **Concurrency**: Google Drive API supports ~10 concurrent requests (adjust as needed)
- **Rate Limits**: 20,000 queries/100 seconds per user (service account is a user)

---

## Advanced Configuration

### Using Multiple Google Accounts

Configure multiple Google Drive OSDs:

```json
{
  "name": "google-drive-personal",
  "device-type": "cloud",
  "credentials": {"file": "./credentials/personal-account.json"},
  ...
},
{
  "name": "google-drive-work",
  "device-type": "cloud",
  "credentials": {"file": "./credentials/work-account.json"},
  ...
}
```

### Shared Folders

To use a specific shared folder as root:

1. Share folder with service account
2. Get folder ID from URL: `https://drive.google.com/drive/folders/{FOLDER_ID}`
3. Modify `googledrive.js` to use that folder ID as parent

### Monitoring

Check Google Cloud Console for:
- API usage and quotas
- Error rates
- Storage usage
- Service account activity

---

## Migration from Local to Google Drive

To migrate existing files from local storage to Google Drive:

```bash
# 1. Query files in local container
curl -X POST http://localhost:3040/rest/objects \
  -H "Content-Type: application/json" \
  -d '{
    "params": {"bucket": "media1"},
    "query": {"match_all": {}}
  }' > files.json

# 2. Extract file IDs and move to Google Drive container
# Use bulkmove1 endpoint with source=media1, target=media-old

curl -X POST http://localhost:3040/rest/bulkmove1 \
  -H "Content-Type: application/json" \
  -d @migration-request.json
```

---

## References

- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/reference)
- [Google Cloud Console](https://console.cloud.google.com/)
- [googleapis npm package](https://www.npmjs.com/package/googleapis)
- [Service Account Authentication](https://cloud.google.com/iam/docs/service-accounts)
- [OAuth2 for Google APIs](https://developers.google.com/identity/protocols/oauth2)

---

## Support

For issues specific to Google Drive OSD:
- Check HSStorageManager logs for detailed error messages
- Verify credentials are valid
- Test API access independently: [OAuth Playground](https://developers.google.com/oauthplayground/)
- Check Google Cloud Console for API errors

For general HSStorageManager issues:
- See [ARCHITECTURE.md](ARCHITECTURE.md)
- See [README.md](README.md)
- Open an issue on GitHub

---

**Version**: 1.0.0
**Last Updated**: 2025-12-23
**Author**: HSStorageManager Team
