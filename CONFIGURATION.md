# Configuration Template for Dream House Interior Estimation System

## Backend Configuration

### Environment Variables (.env file)

Create a `.env` file in the `backend` directory:

```env
# Database Configuration
DATABASE_URL=sqlite:///./estimation_system.db
# For PostgreSQL: postgresql://user:password@localhost/estimation_db
# For MySQL: mysql+pymysql://user:password@localhost/estimation_db

# Server Configuration
ENVIRONMENT=development  # or 'production'
DEBUG=True               # Set to False in production
LOG_LEVEL=info          # debug, info, warning, error, critical

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
RELOAD=True             # Auto-reload on code changes (development only)

# CORS Configuration (Development)
CORS_ORIGINS=*
# For Production, specify exact origins:
# CORS_ORIGINS=["https://yourdomain.com", "https://app.yourdomain.com"]

# PDF Configuration
PDF_OUTPUT_DIR=./generated_pdfs
PDF_MARGIN_TOP=0.5
PDF_MARGIN_BOTTOM=0.5
PDF_MARGIN_LEFT=0.5
PDF_MARGIN_RIGHT=0.5

# Application Settings
COMPANY_NAME=Dream House Interior
COMPANY_LOGO_PATH=./app/data/logo.png  # Optional
MAX_FILE_SIZE=50000000  # 50MB

# Security (Production)
SECRET_KEY=your-secret-key-here-change-in-production
API_KEY=your-api-key-here-if-using-auth
ALGORITHM=HS256

# Email Configuration (Optional, for future email features)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SENDER_EMAIL=your-email@gmail.com
SENDER_PASSWORD=your-app-password
```

### Python Configuration (config.py)

```python
from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./estimation_system.db"

    # API
    api_title: str = "Dream House Interior Estimation API"
    api_version: str = "1.0.0"
    api_description: str = "API for managing interior design quotations"

    # Server
    debug: bool = True
    log_level: str = "info"
    environment: str = "development"

    # CORS
    cors_origins: List[str] = ["*"]

    # PDF
    pdf_output_dir: str = "./generated_pdfs"

    # Security
    secret_key: str = "development-secret-key-change-in-production"
    algorithm: str = "HS256"

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
```

---

## Frontend Configuration

### API Endpoint Configuration (api.js)

Depending on your environment:

```javascript
// Development
const API_URL = "http://localhost:8000/api";

// Production
// const API_URL = "https://api.yourdomain.com/api";

// With environment detection
const API_URL =
  process.env.NODE_ENV === "production"
    ? "https://api.yourdomain.com/api"
    : "http://localhost:8000/api";
```

### Application Settings (data.js)

```javascript
// Application configuration
const APP_CONFIG = {
  // Company Information
  company_name: "Dream House Interior",
  company_location: "Udupi, Karnataka",

  // Currency
  currency: "INR",
  currency_symbol: "₹",

  // Default values
  default_discount: 0,
  default_advance: 0,

  // Validation
  min_rate: 0,
  max_description_length: 200,

  // UI
  items_per_page: 10,
  theme: "light", // or "dark"
};

// Master data for categories/items (if using dropdowns)
const MASTER_DATA = {
  Bedroom: [
    "Master Bedroom - Wardrobe",
    "Master Bedroom - Bed Cot",
    "Common Bedroom - Wardrobe",
  ],
  Living: ["Hall - Wall Panning", "Hall - TV Unit", "Dining - Table"],
  // Add more categories as needed
};
```

---

## Database Configuration

### SQLite (Default)

```python
# No additional configuration needed
# Database file: backend/estimation_system.db
```

### PostgreSQL

1. **Install PostgreSQL**
2. **Create database:**

```sql
CREATE DATABASE estimation_system;
CREATE USER estimation_user WITH PASSWORD 'your_password';
ALTER ROLE estimation_user SET client_encoding TO 'utf8';
ALTER ROLE estimation_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE estimation_user SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE estimation_system TO estimation_user;
```

3. **Update requirements.txt:**

```
psycopg2-binary==2.9.9
```

4. **Update .env:**

```env
DATABASE_URL=postgresql://estimation_user:your_password@localhost:5432/estimation_system
```

### MySQL

1. **Install MySQL**
2. **Create database:**

```sql
CREATE DATABASE estimation_system;
CREATE USER 'estimation_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON estimation_system.* TO 'estimation_user'@'localhost';
FLUSH PRIVILEGES;
```

3. **Update requirements.txt:**

```
PyMySQL==1.1.0
```

4. **Update .env:**

```env
DATABASE_URL=mysql+pymysql://estimation_user:your_password@localhost:3306/estimation_system
```

---

## Server Configuration

### Development Server

```bash
uvicorn app.main:app \
  --reload \
  --host 0.0.0.0 \
  --port 8000 \
  --log-level info
```

### Production Server with Gunicorn

```bash
# Install gunicorn
pip install gunicorn

# Run with 4 workers
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120
```

### Production with Nginx Reverse Proxy

```nginx
upstream estimation_app {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://estimation_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # SSL (after getting certificate)
    # listen 443 ssl http2;
    # ssl_certificate /etc/ssl/certs/yourdomain.crt;
    # ssl_certificate_key /etc/ssl/private/yourdomain.key;
}
```

---

## Logging Configuration

### Backend Logging Setup

```python
# In app/main.py or separate logging.py
import logging
import logging.handlers
from pathlib import Path

# Create logs directory
Path("./logs").mkdir(exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/estimation.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)
```

---

## Security Configuration (Production)

### Secrets Management

```python
# backend/app/config.py
import secrets
from functools import lru_cache

@lru_cache()
def get_settings():
    # In production, load from environment or secrets manager
    secret_key = os.getenv("SECRET_KEY")
    if not secret_key:
        raise ValueError("SECRET_KEY not set in environment")

    return Settings(secret_key=secret_key)
```

### HTTPS Configuration

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ... rest of server config
}
```

---

## Performance Configuration

### Database Connection Pool

```python
# In database.py
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600,
)
```

### Response Caching

```python
# In main.py
from fastapi.middleware.gzip import GZIPMiddleware
from fastapi_cache2 import FastAPICache2
from fastapi_cache2.backends.inmemory import InMemoryBackend

app.add_middleware(GZIPMiddleware, minimum_size=1000)

FastAPICache2.init(InMemoryBackend())
```

---

## Backup Configuration

### Automated SQLite Backup

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="./backups"
DB_FILE="estimation_system.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp backend/$DB_FILE $BACKUP_DIR/$DB_FILE.backup.$TIMESTAMP

# Keep only last 30 days of backups
find $BACKUP_DIR -name "*.backup.*" -mtime +30 -delete
```

Schedule with cron:

```
0 2 * * * /path/to/backup.sh  # Daily at 2 AM
```

---

## Monitoring Configuration

### Application Monitoring Setup

```python
# Optional: Add Sentry for error tracking
import sentry_sdk

sentry_sdk.init(
    dsn="your-sentry-dsn",
    traces_sample_rate=1.0
)
```

### Health Check Monitoring

```python
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }
```

---

## Development vs Production Checklist

### Development (Default)

- ✅ DEBUG = True
- ✅ RELOAD = True
- ✅ CORS_ORIGINS = "\*"
- ✅ Log Level = debug
- ✅ SQLite Database

### Production

- [ ] DEBUG = False
- [ ] RELOAD = False
- [ ] CORS_ORIGINS = [specific domains]
- [ ] Log Level = warning
- [ ] PostgreSQL or MySQL Database
- [ ] HTTPS/SSL enabled
- [ ] SECRET_KEY changed
- [ ] Rate limiting enabled
- [ ] Authentication configured
- [ ] Database backups scheduled
- [ ] Monitoring enabled
- [ ] Error tracking enabled

---

**Note:** Update configuration values before deploying to production!

For more details, see:

- README.md
- TESTING_DEPLOYMENT.md
- API_REFERENCE.md
