# Dream House Interior - Estimation & Contract System

A modern web-based estimation and contract management system designed specifically for interior design contractors.

## Features

✨ **Core Features:**

- 📋 Create professional quotations with detailed line items
- 📊 Automatic calculation of gross totals, discounts, and final amounts
- 📑 PDF generation with professional formatting
- 💾 Database storage for all estimates
- 📱 Responsive design for desktop and mobile
- 🔍 View, edit, and manage all past estimates
- 📥 Download quotations as PDF contracts

## Project Structure

```
estimation_system/
├── backend/                    # Python FastAPI backend
│   ├── app/
│   │   ├── main.py            # FastAPI application & routes
│   │   ├── models.py          # SQLAlchemy ORM models
│   │   ├── schemas.py         # Pydantic data validation schemas
│   │   ├── crud.py            # Database operations
│   │   ├── database.py        # Database configuration
│   │   ├── config.py          # Configuration settings
│   │   ├── data/
│   │   │   └── master_items.json  # Reference data
│   │   └── pdf/
│   │       └── generator.py    # PDF generation engine
│   ├── requirements.txt        # Python dependencies
│   └── generated_pdfs/         # Output directory for PDFs
│
└── frontend/                   # HTML/CSS/JavaScript frontend
    ├── index.html              # Main application UI
    ├── css/
    │   └── style.css           # Application styling
    └── js/
        ├── api.js              # Backend API integration
        ├── calculator.js       # Calculations & UI logic
        └── data.js             # Static data/constants
```

## Technical Stack

### Backend

- **Framework:** FastAPI (Python)
- **Database:** SQLite with SQLAlchemy ORM
- **PDF Generation:** ReportLab
- **API:** RESTful API with CORS support

### Frontend

- **HTML5** for structure
- **CSS3** for responsive design
- **Vanilla JavaScript** for interactivity
- **No external dependencies** (lightweight & fast)

## Installation & Setup

### Prerequisites

- Python 3.8+ (for backend)
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Terminal/Command Prompt access

### Backend Setup

1. **Clone or navigate to the project:**

```bash
cd /Users/itsmemdtofik/Documents/estimation_system
```

2. **Create a Python virtual environment:**

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**

```bash
cd backend
pip install -r requirements.txt
```

4. **Verify installation:**

```bash
pip list
```

### Running the Backend

1. **Start the FastAPI server:**

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

2. **Verify API is running:**
   - Visit: http://localhost:8000/health
   - You should see: `{"status": "ok"}`
   - API Docs: http://localhost:8000/docs (Swagger UI)

### Frontend Setup

1. **In a new terminal, navigate to frontend:**

```bash
cd frontend
```

2. **Start a simple HTTP server:**

```bash
# Python 3
python3 -m http.server 3000

# Or use Node.js http-server (if installed)
npx http-server -p 3000
```

3. **Open in browser:**
   - Visit: http://localhost:3000
   - The UI should load with a form to create estimates

## Usage Guide

### Creating an Estimate

1. **Fill in Project Information:**
   - Location: Where the interior design project is located
   - Date: Project date (auto-populated with today)
   - Party Name: Client/Customer name
   - Mobile Number: Contact number
   - Contractor Name: Your name or company name

2. **Add Line Items:**
   - Click "➕ Add Item" to add a new line
   - For each item, fill in:
     - **Description:** What you're quoting (e.g., "Master Bedroom - Wardrobe")
     - **Size:** Dimensions (e.g., "9'-0\" x 7'-0\"")
     - **S.F.T:** Square feet (area)
     - **Rate:** Per-unit rate
     - **Amount:** Auto-calculated (SFT × Rate)
   - Add as many items as needed

3. **Configure Financial Terms:**
   - **Discount %:** Apply a percentage discount if needed
   - **Advance Payment:** Amount already received/to be received upfront
   - **Final Total:** Auto-calculated with discount and advance deducted

4. **Add Notes (Optional):**
   - Include terms, conditions, or special notes

5. **Generate Quotation:**
   - Click "💾 Save & Generate PDF"
   - The system will:
     - Save to database
     - Generate a professional PDF
     - Auto-download the PDF to your computer

### Viewing Past Estimates

1. Click the "📋 View Estimates" tab
2. See all saved estimates in a table
3. Actions available:
   - **View:** Open estimate details
   - **PDF:** Re-download the PDF
   - **Delete:** Remove the estimate

## API Endpoints

### Estimates

- `POST /api/estimates` - Create new estimate
- `GET /api/estimates` - List all estimates
- `GET /api/estimates/{id}` - Get estimate details
- `PUT /api/estimates/{id}` - Update estimate
- `DELETE /api/estimates/{id}` - Delete estimate
- `GET /api/estimates/{id}/pdf` - Get PDF download link

### Health Check

- `GET /health` - API health status

## Database Schema

### Estimates Table

- `id` - Primary key
- `party_name` - Customer name
- `contractor_name` - Contractor/your name
- `mobile_number` - Contact info
- `location` - Project location
- `date` - Estimate date
- `gross` - Total before discount
- `discount` - Discount percentage
- `advance` - Advance payment
- `final` - Final total (gross - discount - advance)
- `notes` - Additional notes
- `created_at` - Record creation timestamp
- `updated_at` - Record update timestamp

### Estimate Items Table

- `id` - Primary key
- `estimate_id` - Foreign key to Estimates
- `serial_number` - Item number in estimate
- `description` - Item description
- `size` - Size/dimensions
- `sft` - Square feet calculation
- `rate` - Rate per unit
- `amount` - Amount (sft × rate)
- `total` - Final total for line item

## Configuration

### Database Location

Default: `backend/estimation_system.db` (SQLite)

To change, edit `backend/app/database.py`:

```python
DATABASE_URL = "sqlite:///./your_database_name.db"
```

### Server Port

To change backend port, modify the startup command:

```bash
uvicorn app.main:app --port 9000  # Instead of 8000
```

Update `frontend/js/api.js`:

```javascript
const API_URL = "http://localhost:9000/api"; // Update port
```

## PDF Customization

Edit `backend/app/pdf/generator.py` to customize:

- Logo/header
- Color scheme
- Font styles
- Layout format

## Troubleshooting

### "Connection refused" error

- Ensure backend is running: `uvicorn app.main:app --reload`
- Check port 8000 is not in use: `lsof -i :8000`

### PDF not generating

- Verify ReportLab is installed: `pip install reportlab`
- Check `backend/generated_pdfs/` directory exists
- Review error logs in terminal

### Database errors

- Delete `backend/estimation_system.db` to reset database
- Ensure SQLAlchemy is properly installed

### CORS errors

- Backend CORS is enabled by default in `main.py`
- If issues persist, check browser console for specific error

## Security Considerations

⚠️ **For Production:**

- Disable CORS or restrict to specific origins
- Add authentication/authorization
- Use environment variables for sensitive config
- Set up HTTPS
- Implement rate limiting
- Add input validation and sanitization

## Future Enhancements

- 🔐 User authentication & multiple profiles
- 📧 Email quotations directly to clients
- 💳 Payment integration
- 📊 Analytics & reporting dashboard
- 🗂️ Project templates/saved items
- 🖨️ Print directly from browser
- 🌐 Multi-language support
- 📱 Mobile app

## Support & Contribution

For issues or feature requests, document them clearly with:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots/logs if applicable

## License

This project is developed for Dream House Interior.

---

**Created:** January 2026
**Version:** 1.0.0
**Last Updated:** January 29, 2026
