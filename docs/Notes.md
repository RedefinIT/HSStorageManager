
# Storage Server Implementation Details
This storage server is an object storage server where the whole file is an object. 
With this approach the files stored on the storage device can be accessed as regular filesystem files.
If the storage server is down, the files should be accessible by the used directly from the storage drive.
If the files are stored as true object storage with fixed block sizes then recovery of the files in case of 
disaster can be challenging to the end user.

## File Replication
File replication ensures fault tolerance of one drive failure. 
The redundant copy is stored is a low cost drive unlike RAID which requires similar type drive. 

![Storage Architecture](./StorageStorageArchitecture.png "Storage Architecture")
![Storage Architecture](/docs/StorageStorageArchitecture.png "Storage Architecture2")
![Storage Architecture](StorageStorageArchitecture.png "Storage Architecture3")

### Storage Tiers:
- Tier-0: Used for cache. Has containers for thumbnails, staging for imported files and file cache.
- Tier-1: Primary storage tier. Redundant copy of all files in this tier are stored in lower cost Tier-2. Uses entire capacity of the drive. Has 1 or more SSD drives. 
- Tier-2: Secondary storage tier. Requires 2 or more drives in this tier. Has following containers:  
    - L1-Repl-Container which stores redundant copy of all files from L1-Container.   
    - L2-Container is low cost secondary storage for files and keeps redundant copy of all files in another HDD drive.  

_Size of L1-Repl-Container = L1-Container = Size of SSD_


## OSD - Object Storage Device
It is physical storage drive.

### OSD Types

- localSDD - For file cache and thumbnails
- localHDD - For Tier-1 file storage
- cloud - For tier-2 user files
- USB-mass-storage - Backup or tier-2 user files
-  nfs - For tier-3 user contentm 


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

## Buckets
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

### Buckets list
- staging - Bucket for staging newly added file
- system - For storing system files
- system-cach - For caching system files
- media1 - For tier-1 user media files
- media-old - For tier-2 user media files
- backup - For backup
- thumbnails - For storing thumbnails of media and docs
- docs - For tier-1 user docs
- docs-old - For tier-2 user docs


