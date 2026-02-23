from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from app.database import engine, get_db
from app import models
from app.crud import create_estimate, get_estimate, get_all_estimates, update_estimate, delete_estimate
from app.schemas import EstimateCreate, EstimateUpdate, EstimateResponse, EstimateListResponse
from app.pdf.generator import generate_pdf
import os

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Interior Estimation System")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Log validation errors to make 422 causes visible in server logs.
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("[validation_error] path:", request.url.path)
    print("[validation_error] errors:", exc.errors())
    print("[validation_error] body:", exc.body)
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# Mount PDF directory
os.makedirs("generated_pdfs", exist_ok=True)
app.mount("/generated_pdfs", StaticFiles(directory="generated_pdfs"), name="pdfs")

# ============== ESTIMATE ENDPOINTS ==============

@app.post("/api/estimates", response_model=EstimateResponse)
def create_new_estimate(estimate: EstimateCreate, db: Session = Depends(get_db)):
    """Create a new estimation"""
    db_estimate = create_estimate(db, estimate)
    
    # Generate PDF
    try:
        pdf_path = generate_pdf(
            {
                "id": db_estimate.id,
                "party_name": db_estimate.party_name,
                "contractor_name": db_estimate.contractor_name,
                "mobile_number": db_estimate.mobile_number,
                "location": db_estimate.location,
                "date": db_estimate.date,
                "items": [{
                    "serial_number": item.serial_number,
                    "description": item.description,
                    "size": item.size,
                    "sft": item.sft,
                    "rate": item.rate,
                    "amount": item.amount,
                    "total": item.total
                } for item in db_estimate.items],
                "gross": db_estimate.gross,
                "discount": db_estimate.discount,
                "advance": db_estimate.advance,
                "final": db_estimate.final
            },
            db_estimate.id
        )
        db_estimate.pdf_url = f"http://localhost:8000/{pdf_path}"
    except Exception as e:
        print(f"PDF generation failed: {e}")
    
    return db_estimate

@app.get("/api/estimates", response_model=list[EstimateListResponse])
def list_estimates(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all estimates"""
    estimates = get_all_estimates(db, skip=skip, limit=limit)
    return estimates

@app.get("/api/estimates/{estimate_id}", response_model=EstimateResponse)
def get_estimate_detail(estimate_id: int, db: Session = Depends(get_db)):
    """Get a specific estimate"""
    db_estimate = get_estimate(db, estimate_id)
    if not db_estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
    return db_estimate

@app.put("/api/estimates/{estimate_id}", response_model=EstimateResponse)
def update_estimate_detail(estimate_id: int, estimate: EstimateUpdate, db: Session = Depends(get_db)):
    """Update an estimate"""
    db_estimate = update_estimate(db, estimate_id, estimate)
    if not db_estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
    return db_estimate

@app.delete("/api/estimates/{estimate_id}")
def delete_estimate_detail(estimate_id: int, db: Session = Depends(get_db)):
    """Delete an estimate"""
    success = delete_estimate(db, estimate_id)
    if not success:
        raise HTTPException(status_code=404, detail="Estimate not found")
    return {"message": "Estimate deleted successfully"}

@app.get("/api/estimates/{estimate_id}/pdf")
def get_estimate_pdf(estimate_id: int, db: Session = Depends(get_db)):
    """Get PDF download link for estimate"""
    db_estimate = get_estimate(db, estimate_id)
    if not db_estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
    
    pdf_filename = f"estimate_{estimate_id}.pdf"
    pdf_path = f"generated_pdfs/{pdf_filename}"
    
    if os.path.exists(pdf_path):
        return {"pdf_url": f"http://localhost:8000/generated_pdfs/{pdf_filename}"}
    else:
        raise HTTPException(status_code=404, detail="PDF not found")

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "ok"}

