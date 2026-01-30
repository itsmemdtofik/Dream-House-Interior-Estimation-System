# Quick Deployment Checklist

## 🚀 Deploy in 20 Minutes (Railway + Netlify)

### PART 1: Backend on Railway (10 min)

#### Step 1: Create Procfile

```bash
cd backend
echo "web: uvicorn app.main:app --host 0.0.0.0 --port \$PORT" > Procfile
```

#### Step 2: Push to GitHub

```bash
cd /path/to/estimation_system
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/YOUR-USERNAME/estimation-system.git
git branch -M main
git push -u origin main
```

#### Step 3: Deploy on Railway

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Authorize GitHub
5. Select your repository
6. Wait for deploy (Railway detects Python automatically)
7. **Copy the URL** given by Railway (e.g., `https://yourapp.railway.app`)

---

### PART 2: Frontend on Netlify (5 min)

#### Step 1: Update API URL

Edit `frontend/js/api.js`:

```javascript
// OLD:
const API_BASE = "http://localhost:8000";

// NEW:
const API_BASE = "https://your-railway-url.railway.app";
```

#### Step 2: Create Netlify Config

Create `frontend/netlify.toml`:

```toml
[build]
  command = "echo 'Static build'"
  publish = "."

[[redirects]]
  from = "/api/*"
  to = "https://your-railway-url.railway.app/api/:splat"
  status = 200
```

#### Step 3: Push Changes

```bash
git add .
git commit -m "Update for production deployment"
git push origin main
```

#### Step 4: Deploy on Netlify

1. Go to https://netlify.com
2. Click "Add new site" → "Import an existing project"
3. Select "GitHub"
4. Authorize Netlify
5. Select your repository
6. Configure build:
   - **Build command:** (leave empty)
   - **Publish directory:** `frontend`
7. Click "Deploy"
8. **Copy Netlify URL** (e.g., `https://your-app.netlify.app`)

---

## ✅ Test Your Deployment

```bash
1. Open: https://your-app.netlify.app
2. Fill the form
3. Add items
4. Click "Save & Generate PDF"
5. Go to "View Estimates"
6. Your data should appear ✅
7. Click "View" → Modal shows
8. Download PDF → Works ✅
9. Success! 🎉
```

---

## 🔧 If Something Goes Wrong

### Backend Not Connecting

```bash
# Check Railway logs:
1. Go to railway.app dashboard
2. Click your project
3. Click "Logs" tab
4. Look for errors

# Most common: CORS issue
# Fix: Add CORS to backend/app/main.py
```

### Database Errors

```bash
# Railway might have issues with SQLite
# Solution: Use PostgreSQL instead
# Railway → Resources → Add PostgreSQL
# Update backend/database.py to use it
```

### Frontend Won't Load

```bash
# Check Netlify build logs:
1. Go to netlify.com
2. Click your site
3. Go to "Deploys" tab
4. Click latest deploy
5. View logs

# Most common: api.js URL wrong
```

---

## 📊 Cost Breakdown

| Service   | Cost     | Notes                          |
| --------- | -------- | ------------------------------ |
| Railway   | FREE     | (or $5/mo for pro)             |
| Netlify   | FREE     | (or $19/mo for pro)            |
| **Total** | **FREE** | Both have excellent free tiers |

---

## 🎯 Recommended Setup

**Best for your use case:**

```
Railway (Backend) + Netlify (Frontend) = 20 minutes to live ✅

✅ Totally free
✅ Professional quality
✅ Auto-updates on git push
✅ Easy to scale
✅ Great uptime
✅ Easy to add custom domain
```

---

## 🆘 Need Help?

### Check these files:

- `DEPLOYMENT_GUIDE.md` - Full detailed guide
- `backend/requirements.txt` - Your dependencies ✅
- `frontend/js/api.js` - Update API URL here

### Common Errors:

| Error              | Solution                       |
| ------------------ | ------------------------------ |
| 404 Not Found      | Wrong API URL in api.js        |
| CORS error         | Add CORS middleware in main.py |
| 500 Internal Error | Check Railway logs             |
| Database error     | Use PostgreSQL not SQLite      |

---

## ✨ Done!

Your production app is ready to deploy! 🚀

**Estimated time: 20 minutes**
**Estimated cost: FREE**

Start with Railway backend, then Netlify frontend. You'll have a live app by dinner time! 🎉
