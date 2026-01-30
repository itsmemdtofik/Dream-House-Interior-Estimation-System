# Quick Start Guide - Dream House Interior Estimation System

## 🚀 Get Started in 2 Minutes

### Step 1: Install Python (if not already installed)

Download from: https://www.python.org/downloads/

### Step 2: Start the System

#### Option A: Using Startup Script (Recommended)

**On macOS/Linux:**

```bash
chmod +x start.sh
./start.sh
```

**On Windows:**
Double-click `start.bat`

The script will:

- ✅ Create a virtual environment
- ✅ Install all dependencies
- ✅ Start the backend server
- ✅ Start the frontend server
- ✅ Open the application in your browser

#### Option B: Manual Startup

**Terminal 1 - Backend:**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**

```bash
cd frontend
python3 -m http.server 3000
```

Then open: http://localhost:3000

---

## 📝 Creating Your First Estimate

1. Fill in the **Project Information**:
   - Location
   - Party Name (client)
   - Contractor Name
   - Mobile Number

2. **Add Line Items** by clicking "➕ Add Item":
   - Description (e.g., "Master Bedroom - Wardrobe")
   - Size (e.g., "9'-0\" x 7'-0\"")
   - S.F.T (Square Feet)
   - Rate per unit

3. Set **Financial Terms**:
   - Discount % (optional)
   - Advance Payment (optional)

4. Click **"💾 Save & Generate PDF"**

That's it! Your PDF quotation will be generated and downloaded automatically.

---

## 🔗 Quick Links

- **Application:** http://localhost:3000
- **API Documentation:** http://localhost:8000/docs
- **API Status:** http://localhost:8000/health
- **Database:** `backend/estimation_system.db`

---

## ❓ Common Issues & Solutions

### "Connection refused" error?

- Make sure backend is running on Terminal 1
- Check: http://localhost:8000/health

### PDF not downloading?

- Check browser console (F12 → Console tab)
- Ensure `backend/generated_pdfs/` directory exists

### Port already in use?

```bash
# Find process using port 8000
lsof -i :8000

# Or change port in start command
uvicorn app.main:app --port 9000
```

---

## 📚 Full Documentation

For detailed documentation, see: `README.md`

---

**Enjoy managing your interior design estimates! 🎉**
