/**
 * Google Drive OSD Implementation
 * Created: 2025-12-23
 *
 * This module provides Google Drive integration as an Object Storage Device (OSD).
 * It uses the Google Drive API v3 to store and retrieve files from Google Drive.
 *
 * Authentication:
 * - Service Account (recommended for server-to-server)
 * - OAuth2 (for user-delegated access)
 *
 * Configuration:
 * - credentials.json file with service account key
 * - Or OAuth2 client credentials
 */

'use strict';

const { google } = require('googleapis');
const { Readable, PassThrough } = require('stream');
const fs = require('fs');
const path = require('path');

// Google Drive API client (initialized per OSD)
let driveClients = {};

/**
 * Initialize Google Drive client for an OSD
 * @param {Object} osd - OSD configuration
 * @returns {Object} Google Drive client
 */
function initializeDriveClient(osd) {
  const osdName = osd.name;

  // Return existing client if already initialized
  if (driveClients[osdName]) {
    return driveClients[osdName];
  }

  try {
    const credentials = osd.credentials;

    // Check if credentials are provided
    if (!credentials || Object.keys(credentials).length === 0) {
      console.error('GoogleDrive OSD: No credentials provided for', osdName);
      throw new Error('Google Drive credentials required');
    }

    let auth;

    // Service Account authentication (recommended)
    if (credentials.type === 'service_account') {
      auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });
    }
    // OAuth2 authentication
    else if (credentials.client_id && credentials.client_secret) {
      const oauth2Client = new google.auth.OAuth2(
        credentials.client_id,
        credentials.client_secret,
        credentials.redirect_uri
      );

      // Set refresh token if available
      if (credentials.refresh_token) {
        oauth2Client.setCredentials({
          refresh_token: credentials.refresh_token
        });
      }

      auth = oauth2Client;
    }
    // Credentials from file path
    else if (credentials.file) {
      const credentialsPath = credentials.file;
      const keyFile = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

      auth = new google.auth.GoogleAuth({
        credentials: keyFile,
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });
    }
    else {
      throw new Error('Invalid Google Drive credentials format');
    }

    // Create Drive client
    const drive = google.drive({ version: 'v3', auth });

    // Cache the client
    driveClients[osdName] = drive;

    console.log('GoogleDrive OSD: Initialized client for', osdName);
    return drive;

  } catch (error) {
    console.error('GoogleDrive OSD: Failed to initialize client:', error);
    throw error;
  }
}

/**
 * Get or create a folder in Google Drive
 * @param {Object} drive - Google Drive client
 * @param {String} folderPath - Folder path (e.g., "/media1")
 * @param {String} parentId - Parent folder ID (optional)
 * @returns {Promise<String>} Folder ID
 */
async function getOrCreateFolder(drive, folderPath, parentId = null) {
  // Remove leading/trailing slashes
  const cleanPath = folderPath.replace(/^\/+|\/+$/g, '');

  if (!cleanPath) {
    return parentId || 'root';
  }

  // Split path into parts
  const parts = cleanPath.split('/');
  let currentParentId = parentId || 'root';

  // Create/find each folder in the path
  for (const folderName of parts) {
    // Search for existing folder
    const query = `name='${folderName}' and '${currentParentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.data.files.length > 0) {
      // Folder exists
      currentParentId = response.data.files[0].id;
    } else {
      // Create folder
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [currentParentId]
      };

      const folder = await drive.files.create({
        resource: folderMetadata,
        fields: 'id'
      });

      currentParentId = folder.data.id;
      console.log('GoogleDrive OSD: Created folder', folderName, 'with ID', currentParentId);
    }
  }

  return currentParentId;
}

/**
 * GoogleDrive OSD module
 */
const GoogleDrive = {

  /**
   * Create a new file in Google Drive
   * @param {Object} osd - OSD configuration
   * @param {Object} bucket - Bucket configuration
   * @param {Object} filedata - File metadata
   * @param {Function} callback - Callback with (writeStream, filedata)
   */
  createFile: async function(osd, bucket, filedata, callback) {
    console.log('GoogleDrive:createFile: bucket:', bucket.name);
    console.log('GoogleDrive:createFile: filedata:', filedata.id);

    try {
      const drive = initializeDriveClient(osd);

      // Get or create the bucket folder
      const folderId = await getOrCreateFolder(drive, bucket.basepath);

      // Create a PassThrough stream that we'll return to the caller
      const passThroughStream = new PassThrough();

      // File metadata for Google Drive
      const driveFileMetadata = {
        name: filedata.id,
        parents: [folderId]
      };

      // Set the path in our filedata (format: osd_name:folder_id/file_id)
      filedata.path = `${osd.name}:${folderId}/${filedata.id}`;

      // Collect chunks for upload
      const chunks = [];
      let totalSize = 0;

      passThroughStream.on('data', (chunk) => {
        chunks.push(chunk);
        totalSize += chunk.length;
      });

      passThroughStream.on('end', async () => {
        try {
          // Combine all chunks into a single buffer
          const fileBuffer = Buffer.concat(chunks);

          // Create a readable stream from the buffer
          const bufferStream = new Readable();
          bufferStream.push(fileBuffer);
          bufferStream.push(null);

          // Upload to Google Drive
          const response = await drive.files.create({
            resource: driveFileMetadata,
            media: {
              mimeType: filedata.mimetype || 'application/octet-stream',
              body: bufferStream
            },
            fields: 'id, name, size, webViewLink, webContentLink'
          });

          console.log('GoogleDrive:createFile: Uploaded file', response.data.id);

          // Store Google Drive file ID in metadata
          filedata.driveFileId = response.data.id;
          filedata.driveWebViewLink = response.data.webViewLink;
          filedata.driveWebContentLink = response.data.webContentLink;

        } catch (error) {
          console.error('GoogleDrive:createFile: Upload error:', error);
        }
      });

      // Return the PassThrough stream immediately
      callback(passThroughStream, filedata);

    } catch (error) {
      console.error('GoogleDrive:createFile: Error:', error);
      throw error;
    }
  },

  /**
   * Read a file from Google Drive
   * @param {Object} osd - OSD configuration
   * @param {String} relativepath - Relative path (folder_id/file_id)
   * @returns {Stream} Readable stream
   */
  readFile: async function(osd, relativepath) {
    console.log('GoogleDrive:readFile: relativepath:', relativepath);

    try {
      const drive = initializeDriveClient(osd);

      // Extract file ID from path (format: folder_id/file_id)
      const parts = relativepath.split('/');
      const fileId = parts[parts.length - 1];

      console.log('GoogleDrive:readFile: fileId:', fileId);

      // Download file from Google Drive
      const response = await drive.files.get(
        {
          fileId: fileId,
          alt: 'media'
        },
        { responseType: 'stream' }
      );

      return response.data;

    } catch (error) {
      console.error('GoogleDrive:readFile: Error:', error);
      throw error;
    }
  },

  /**
   * Delete a file from Google Drive
   * @param {Object} osd - OSD configuration
   * @param {String} relativepath - Relative path (folder_id/file_id)
   */
  deleteFile: async function(osd, relativepath) {
    console.log('GoogleDrive:deleteFile: relativepath:', relativepath);

    try {
      const drive = initializeDriveClient(osd);

      // Extract file ID from path
      const parts = relativepath.split('/');
      const fileId = parts[parts.length - 1];

      console.log('GoogleDrive:deleteFile: fileId:', fileId);

      // Delete file (move to trash)
      await drive.files.delete({
        fileId: fileId
      });

      console.log('GoogleDrive:deleteFile: Deleted file', fileId);

    } catch (error) {
      console.error('GoogleDrive:deleteFile: Error:', error);
      throw error;
    }
  },

  /**
   * List files in a folder (utility function)
   * @param {Object} osd - OSD configuration
   * @param {String} folderId - Folder ID
   * @returns {Promise<Array>} List of files
   */
  listFiles: async function(osd, folderId = 'root') {
    try {
      const drive = initializeDriveClient(osd);

      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, size, mimeType, createdTime, modifiedTime)',
        spaces: 'drive'
      });

      return response.data.files || [];

    } catch (error) {
      console.error('GoogleDrive:listFiles: Error:', error);
      throw error;
    }
  },

  /**
   * Get file metadata (utility function)
   * @param {Object} osd - OSD configuration
   * @param {String} fileId - File ID
   * @returns {Promise<Object>} File metadata
   */
  getFileMetadata: async function(osd, fileId) {
    try {
      const drive = initializeDriveClient(osd);

      const response = await drive.files.get({
        fileId: fileId,
        fields: 'id, name, size, mimeType, createdTime, modifiedTime, webViewLink, webContentLink'
      });

      return response.data;

    } catch (error) {
      console.error('GoogleDrive:getFileMetadata: Error:', error);
      throw error;
    }
  }

};

module.exports = GoogleDrive;
