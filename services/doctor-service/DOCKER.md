# ═══════════════════════════════════════════════════════════════════════════════
# Docker Guide - Smart Healthcare Platform
# ═══════════════════════════════════════════════════════════════════════════════

## Quick Start

### 1. Start All Services
```bash
# From project root
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api-gateway
```

### 2. Stop All Services
```bash
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### 3. Rebuild After Code Changes
```bash
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build api-gateway

# Rebuild and restart
docker-compose up -d --build
```

## Service URLs

- **API Gateway**: http://localhost:3000 (PUBLIC - use this!)
- MongoDB: localhost:27017
- Kafka: localhost:9092

Internal services (not directly accessible):
- Patient Service: http://patient-service:5001 (internal only)
- Audit Service: http://audit-service:5002 (internal only)

## Environment Variables

Copy `.env.docker` to `.env` and update values:

```bash
cp .env.docker .env
# Edit .env with your values
```

**Required:**
- `JWT_SECRET` - Strong secret for JWT (32+ characters)
- `INTERNAL_API_KEY` - Strong key for service-to-service auth

## Health Checks

```bash
# Check all services
docker-compose ps

# API Gateway
curl http://localhost:3000/health

# Individual service health (from inside container)
docker-compose exec patient-service wget -qO- http://localhost:5001/health
```

## Troubleshooting

### Services not starting
```bash
# Check logs
docker-compose logs

# Check specific service
docker-compose logs api-gateway

# Restart service
docker-compose restart api-gateway
```

### MongoDB connection issues
```bash
# Check MongoDB is running
docker-compose ps mongodb

# Check MongoDB logs
docker-compose logs mongodb

# Connect to MongoDB shell
docker-compose exec mongodb mongosh
```

### Kafka connection issues
```bash
# Check Kafka is running
docker-compose ps kafka

# List Kafka topics
docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:9092

# Create topic manually if needed
docker-compose exec kafka kafka-topics --create \
  --topic user-registered \
  --bootstrap-server localhost:9092 \
  --partitions 1 \
  --replication-factor 1
```

### Rebuild from scratch
```bash
# Stop everything and remove volumes
docker-compose down -v

# Rebuild images
docker-compose build --no-cache

# Start fresh
docker-compose up -d
```

## Development vs Production

**Development (current setup):**
- Exposed ports for debugging
- Logs to stdout
- Hot-reload not enabled (would need volume mounts)

**Production recommendations:**
- Remove MongoDB/Kafka port exposure
- Use external managed services (MongoDB Atlas, Confluent Cloud)
- Add Nginx reverse proxy for HTTPS
- Use secrets management (Docker secrets, AWS Secrets Manager)
- Enable monitoring (Prometheus, Grafana)

## Architecture

```
docker-compose.yml orchestrates:
  ├── mongodb (shared database)
  ├── zookeeper (Kafka dependency)
  ├── kafka (message broker)
  ├── api-gateway:3000 (public)
  ├── patient-service:5001 (internal)
  └── audit-service:5002 (internal)
```

All services run on `healthcare-network` bridge network.

## Useful Commands

```bash
# View resource usage
docker stats

# Clean up unused images
docker system prune -a

# Backup MongoDB data
docker-compose exec mongodb mongodump --out=/data/db/backup

# Restore MongoDB data
docker-compose exec mongodb mongorestore /data/db/backup

# Shell into container
docker-compose exec api-gateway sh

# Restart individual service
docker-compose restart patient-service

# Scale service (horizontal scaling)
docker-compose up -d --scale patient-service=3
```
