# Google Drive Credentials

This directory contains Google Drive API credentials for the Google Drive OSD.

## Setup

1. Copy the example file:
   ```bash
   cp google-drive-service-account.json.example google-drive-service-account.json
   ```

2. Replace the placeholder values with your actual credentials from Google Cloud Console

3. Set proper permissions:
   ```bash
   chmod 600 google-drive-service-account.json
   ```

## Security

⚠️ **IMPORTANT**: Never commit actual credentials to Git!

The `.gitignore` file is configured to exclude:
- `*.json` (all JSON files in credentials directory)
- Only `.example` files are tracked in Git

## Getting Credentials

See [GOOGLE_DRIVE_SETUP.md](../GOOGLE_DRIVE_SETUP.md) for detailed instructions on:
- Creating a Google Cloud project
- Enabling the Google Drive API
- Creating a service account
- Downloading credentials

## Credential Types

### Service Account (Recommended)
- **File**: `google-drive-service-account.json`
- **Use case**: Server-to-server, automated backups
- **Format**: See `google-drive-service-account.json.example`

### OAuth2 (Alternative)
- **File**: `google-drive-oauth2.json`
- **Use case**: User-delegated access
- **Format**: Contains client_id, client_secret, refresh_token

## Troubleshooting

If you see errors like "credentials required":
1. Verify the file exists: `ls -la google-drive-service-account.json`
2. Check file permissions: Should be readable by the server process
3. Validate JSON syntax: `cat google-drive-service-account.json | python -m json.tool`
4. Ensure the file path in `objectstoredevices.json` is correct
