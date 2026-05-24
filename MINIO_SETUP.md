# MinIO Local Setup Guide

## Quick Start

### 1. Start MinIO with Docker

Open a terminal in the **project root directory** (`c:\Users\edgeprod\Desktop\finora\`) and run:

```bash
# Make sure you're in the finora root folder
cd c:\Users\edgeprod\Desktop\finora

# Start MinIO
docker-compose -f docker-compose.minio.yml up -d
```

This will:

- Download the MinIO image (if not already downloaded)
- Start MinIO on ports 9000 (API) and 9001 (Web Console)
- Create a persistent volume for your data

### 2. Verify MinIO is Running

Check if the container is running:

```bash
docker ps
```

You should see a container named `finora-minio` running.

### 3. Access MinIO Console (Web UI)

Open your browser and go to: http://localhost:9001

Login credentials:

- **Username:** minioadmin
- **Password:** minioadmin123

### 4. Start Your Backend Server

The `.env` file has been created with the correct MinIO configuration. Now start your server:

```bash
cd packages/server
npm run start:dev
```

The server will automatically:

- Connect to MinIO
- Create the `finora-documents` bucket if it doesn't exist
- Be ready to handle file uploads

### 5. Test File Upload

Try uploading a file through your application (e.g., supplier logo, document, etc.)

You can view the uploaded files in the MinIO Console at http://localhost:9001

---

## Useful Commands

### Stop MinIO

```bash
docker-compose -f docker-compose.minio.yml down
```

### Stop and Remove Data

```bash
docker-compose -f docker-compose.minio.yml down -v
```

### View MinIO Logs

```bash
docker logs finora-minio
```

### Restart MinIO

```bash
docker-compose -f docker-compose.minio.yml restart
```

---

## Troubleshooting

### Port Already in Use

If port 9000 or 9001 is already in use, edit `docker-compose.minio.yml` and change:

```yaml
ports:
  - '9002:9000' # Change 9002 to any available port
  - '9003:9001' # Change 9003 to any available port
```

Then update `.env` file:

```
MINIO_PORT=9002
MINIO_PUBLIC_URL=http://localhost:9002
```

### Connection Failed

1. Make sure Docker is running
2. Check if MinIO container is running: `docker ps`
3. Check MinIO logs: `docker logs finora-minio`
4. Verify `.env` file has correct credentials

### Bucket Not Created

The bucket is automatically created when the server starts. If you see errors:

1. Go to MinIO Console (http://localhost:9001)
2. Click "Buckets" in the left menu
3. Click "Create Bucket"
4. Name it: `finora-documents`
5. Click "Create Bucket"

---

## Production Considerations

For production, you should:

1. Change the default credentials in `docker-compose.minio.yml`
2. Update the `.env` file with new credentials
3. Enable SSL (`MINIO_USE_SSL=true`)
4. Use a proper domain name instead of localhost
5. Set up backup strategies for the MinIO data volume

---

## Data Location

All uploaded files are stored in the Docker volume `minio_data`. This data persists even when you stop the container.

To backup your data:

```bash
docker run --rm -v minio_data:/data -v ${PWD}:/backup alpine tar czf /backup/minio-backup.tar.gz /data
```

To restore from backup:

```bash
docker run --rm -v minio_data:/data -v ${PWD}:/backup alpine tar xzf /backup/minio-backup.tar.gz -C /
```
