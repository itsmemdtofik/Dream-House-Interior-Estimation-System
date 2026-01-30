# Testing & Deployment Guide

## 🧪 Testing the System

### Prerequisites

- Backend running on http://localhost:8000
- Frontend running on http://localhost:3000
- All dependencies installed from `requirements.txt`

### Manual Testing Checklist

#### Backend API Tests

1. **Health Check**

   ```bash
   curl http://localhost:8000/health
   ```

   Expected: `{"status":"ok"}`

2. **Create Estimate** (POST /api/estimates)

   ```bash
   curl -X POST http://localhost:8000/api/estimates \
     -H "Content-Type: application/json" \
     -d '{
       "party_name": "Test Customer",
       "contractor_name": "Test Contractor",
       "mobile_number": "9845645828",
       "location": "Test Location",
       "date": "2026-01-29T00:00:00",
       "discount": 5,
       "advance": 1000,
       "items": [
         {
           "serial_number": 1,
           "description": "Master Bedroom - Wardrobe",
           "size": "9-0 x 7-0",
           "sft": 63,
           "rate": 1300,
           "amount": 81900
         }
       ]
     }'
   ```

3. **Get All Estimates** (GET /api/estimates)

   ```bash
   curl http://localhost:8000/api/estimates
   ```

4. **Get Specific Estimate** (GET /api/estimates/{id})

   ```bash
   curl http://localhost:8000/api/estimates/1
   ```

5. **API Documentation**
   - Visit: http://localhost:8000/docs
   - Interactive Swagger UI with all endpoints

#### Frontend UI Tests

1. **Form Validation**
   - [ ] Try submitting empty form - should show errors
   - [ ] Enter valid data in all fields
   - [ ] Verify calculations update in real-time

2. **Line Items**
   - [ ] Add multiple items
   - [ ] Verify SFT and Amount auto-calculate
   - [ ] Delete items and verify serial numbers renumber
   - [ ] Check gross total updates correctly

3. **Financial Calculations**
   - [ ] Enter discount percentage - final total should decrease
   - [ ] Enter advance payment - final total should decrease
   - [ ] Verify all calculations are correct

4. **PDF Generation**
   - [ ] Create estimate and click "Save & Generate PDF"
   - [ ] PDF should download automatically
   - [ ] Open PDF and verify all data is correct
   - [ ] Check formatting and layout

5. **Estimate List View**
   - [ ] Switch to "View Estimates" tab
   - [ ] Verify all created estimates appear
   - [ ] Test "View", "PDF", and "Delete" buttons
   - [ ] Refresh list and verify data persists

### Automated Testing Script (Optional)

Create `backend/test_api.py`:

```python
import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_create_estimate():
    """Test creating a new estimate"""
    payload = {
        "party_name": "Test Client",
        "contractor_name": "Test Contractor",
        "mobile_number": "1234567890",
        "location": "Test Location",
        "discount": 5,
        "advance": 1000,
        "items": [
            {
                "serial_number": 1,
                "description": "Wardrobe",
                "size": "10x10",
                "sft": 100,
                "rate": 500,
                "amount": 50000
            }
        ]
    }

    response = requests.post(f"{BASE_URL}/estimates", json=payload)
    assert response.status_code == 200, f"Create failed: {response.text}"
    result = response.json()
    print(f"✅ Created estimate ID: {result['id']}")
    return result['id']

def test_get_estimate(estimate_id):
    """Test retrieving an estimate"""
    response = requests.get(f"{BASE_URL}/estimates/{estimate_id}")
    assert response.status_code == 200, f"Get failed: {response.text}"
    print(f"✅ Retrieved estimate: {response.json()['party_name']}")

def test_get_all_estimates():
    """Test listing all estimates"""
    response = requests.get(f"{BASE_URL}/estimates")
    assert response.status_code == 200, f"List failed: {response.text}"
    estimates = response.json()
    print(f"✅ Found {len(estimates)} estimates")

def test_update_estimate(estimate_id):
    """Test updating an estimate"""
    payload = {
        "party_name": "Updated Client Name",
        "discount": 10
    }
    response = requests.put(f"{BASE_URL}/estimates/{estimate_id}", json=payload)
    assert response.status_code == 200, f"Update failed: {response.text}"
    print(f"✅ Updated estimate {estimate_id}")

if __name__ == "__main__":
    print("🧪 Running API tests...\n")

    # Test flow
    estimate_id = test_create_estimate()
    test_get_estimate(estimate_id)
    test_get_all_estimates()
    test_update_estimate(estimate_id)

    print("\n✅ All tests passed!")
```

Run with:

```bash
python3 -m pip install requests
python3 test_api.py
```

---

## 🚀 Deployment Guide

### Development to Production Transition

#### Step 1: Environment Configuration

Create `backend/.env`:

```
DATABASE_URL=sqlite:///./production.db
ENVIRONMENT=production
LOG_LEVEL=info
```

Update `backend/app/database.py` to read from `.env`

#### Step 2: Security Hardening

1. **Add Authentication** (Optional but recommended)

```python
# In main.py
from fastapi.security import HTTPBearer
from fastapi import Depends, HTTPException

security = HTTPBearer()

@app.post("/api/estimates")
async def create_estimate(
    estimate: EstimateCreate,
    credentials = Depends(security),
    db: Session = Depends(get_db)
):
    # Validate API key
    if credentials.credentials != "YOUR_API_KEY":
        raise HTTPException(status_code=403)
    # Continue with estimate creation...
```

2. **Restrict CORS**

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Specific domain
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

3. **Add HTTPS**
   - Use Nginx or Apache as reverse proxy
   - Obtain SSL certificate (Let's Encrypt)
   - Configure HTTPS redirect

#### Step 3: Deployment Options

##### Option A: Heroku

```bash
# Install Heroku CLI
# Login: heroku login
# Create app: heroku create your-app-name

# Create Procfile:
echo "web: uvicorn app.main:app --host 0.0.0.0 --port $PORT" > backend/Procfile

# Deploy
git push heroku main
```

##### Option B: DigitalOcean/AWS/Azure

1. **Create a Linux server** (Ubuntu 20.04+)

2. **Connect and setup:**

```bash
ssh root@your_server_ip

# Update system
apt update && apt upgrade -y

# Install Python, Nginx, Supervisor
apt install -y python3 python3-pip nginx supervisor

# Clone repository
cd /var/www
git clone your-repo-url estimation_system
cd estimation_system/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. **Configure Supervisor** (`/etc/supervisor/conf.d/estimation.conf`):

```ini
[program:estimation]
directory=/var/www/estimation_system/backend
command=/var/www/estimation_system/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
autostart=true
autorestart=true
stderr_logfile=/var/log/estimation.err.log
stdout_logfile=/var/log/estimation.out.log
```

4. **Configure Nginx** (`/etc/nginx/sites-available/estimation`):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

5. **Enable and restart:**

```bash
supervisorctl reread
supervisorctl update
supervisorctl start estimation

systemctl restart nginx
```

##### Option C: Docker

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Create `docker-compose.yml`:

```yaml
version: "3.8"

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend/generated_pdfs:/app/generated_pdfs

  frontend:
    image: nginx:latest
    ports:
      - "3000:80"
    volumes:
      - ./frontend:/usr/share/nginx/html
```

Run with:

```bash
docker-compose up -d
```

---

## 📊 Performance Optimization

1. **Database Indexing**

```python
# In models.py
class Estimate(Base):
    __tablename__ = "estimates"
    __table_args__ = (
        Index('idx_party_name', 'party_name'),
        Index('idx_date', 'date'),
    )
```

2. **Caching**

```python
from functools import lru_cache

@app.get("/api/estimates")
@lru_cache(maxsize=32)
def list_estimates(skip: int = 0, limit: int = 100):
    # ...
```

3. **Pagination** (already implemented)

4. **Compression**

```python
from fastapi.middleware.gzip import GZIPMiddleware
app.add_middleware(GZIPMiddleware, minimum_size=1000)
```

---

## 🔍 Monitoring & Logging

Add logging to `backend/app/main.py`:

```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.post("/api/estimates")
def create_estimate(estimate: EstimateCreate, db: Session = Depends(get_db)):
    logger.info(f"Creating estimate for {estimate.party_name}")
    try:
        # ... create estimate ...
        logger.info(f"Estimate {estimate_id} created successfully")
    except Exception as e:
        logger.error(f"Error creating estimate: {str(e)}")
        raise
```

---

## ✅ Production Checklist

- [ ] Environment variables configured
- [ ] Database backed up
- [ ] HTTPS enabled
- [ ] CORS restricted
- [ ] Rate limiting implemented
- [ ] Error logging configured
- [ ] Performance tested under load
- [ ] Security scan completed
- [ ] Database indexes created
- [ ] Monitoring alerts set up
- [ ] Backup strategy documented
- [ ] Disaster recovery plan ready

---

For more help or questions, refer to the main [README.md](README.md)
