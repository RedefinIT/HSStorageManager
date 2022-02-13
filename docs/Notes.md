
# **Replicated File Server for HomeServer**

## Storage Server Implementation Details
This storage server is an object storage server where the whole file is an object. 
With this approach the files stored on the storage device can be accessed as regular filesystem files.
If the storage server is down, the files should be accessible by the used directly from the storage drive.
If the files are stored as true object storage with fixed block sizes then recovery of the files in case of 
disaster can be challenging to the end user.

### OSD - Object Storage Device
OSD can be a physical storage drive, cloud storage drive or network attached storage (NAS).

#### OSD Types
OSD types specify if the OSD is local attached hard disk (HDD), SSD, NVMe, cloud storage,
external USB or network attached storage.


Types:
- localSDD - For file cache and thumbnails
- localHDD - For Tier-1 file storage
- cloud - For tier-2 user files
- USB-mass-storage - Backup or tier-2 user files
-  nfs - Network attached storage.


OSDs are defined in `configuration/objectstoredevices.json`

Typical OSD data:
```json
{
      "name": "localhdd1",
      "protocol": "file",
      "device-id": "",
      "device-type": "localHDD",
      "credentials": {},
      "permission": "rw",
      "path": "/home/govind/HDD/LOCALSTORAGE"
    }
```

### Buckets
Buckets are storage containers. Storage policies can be applied at bucket level.
Also the files replication is performed at bucket level.
Buckets are created for category of files like media, docs etc.
Buckets are also created for system usage such as staging, thumbnails, cache etc.
OSD (physical storage drive) can have multiple containers.

The buckets are defined in `config/objectstorecontainers.json`

Each bucket definition looks like this:

```json
{
      "name": "staging",
      "description": "Bucket for staging newly added file",
      "policyJSON": { },
      "osds": [
        "localsdd1"
      ],
      "basepath": "/staging",
      "containertype": "staging"
}
```

Each bucket can be associate with multiple OSDs.
The bucket name is used in the HTTPS path of the file like:
```https://servername/bucket1/fileObjId1```
Every file can be accessed using the combination of 'bucket' and file 'objID' which is usually file name or GUID.

#### Buckets list
The following buckets (storage containers) are precreated in the storage server for HomeServer.

- staging - Bucket for staging newly added file
- system - For storing system files
- system-cach - For caching system files
- media1 - For tier-1 user media files
- media-old - For tier-2 user media files
- backup - For backup
- thumbnails - For storing thumbnails of media and docs
- docs - For tier-1 user docs
- docs-old - For tier-2 user docs

### File Replication
File replication ensures fault tolerance of one drive failure.
The redundant copy is stored is a low cost drive unlike RAID which requires similar type drive.

<img src=./StorageArchitecture.png width=350>

#### Storage Tiers:
- Tier-0: Used for cache. Has containers for thumbnails, staging for imported files and file cache.
- Tier-1: Primary storage tier. This storage tier is where all the primary content resides. Redundant copy of all files in this tier are stored in lower cost Tier-2. Uses entire capacity of the drive. Has 1 or more SSD drives.
- Tier-2: Secondary storage tier. Requires 2 or more drives in this tier. Has following containers:
  - L1-Repl-Container which stores redundant copy of all files from L1-Container.
  - L2-Container is low cost secondary storage for files and keeps redundant copy of all files in another HDD drive.

_Size of L1-Repl-Container = L1-Container = Size of SSD_

