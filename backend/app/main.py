from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from app.database import engine, get_db, ensure_sqlite_schema
from app import models
from app.crud import (
    create_estimate,
    get_estimate,
    get_all_estimates,
    update_estimate,
    delete_estimate,
    duplicate_estimate,
    list_templates,
    create_template,
    delete_template,
)
from app.schemas import (
    EstimateCreate,
    EstimateUpdate,
    EstimateResponse,
    EstimateListResponse,
    TemplateCreate,
    TemplateResponse,
)
from app.pdf.generator import generate_pdf
import os
import csv
import io
import json

# Create tables and ensure schema for SQLite
models.Base.metadata.create_all(bind=engine)
ensure_sqlite_schema(engine)

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
                    "category": item.category,
                    "description": item.description,
                    "size": item.size,
                    "sft": item.sft,
                    "rate": item.rate,
                    "cost_rate": item.cost_rate,
                    "amount": item.amount,
                    "total": item.total,
                    "cost_amount": item.cost_amount,
                    "profit": item.profit,
                    "margin_percent": item.margin_percent
                } for item in db_estimate.items],
                "gross": db_estimate.gross,
                "discount": db_estimate.discount,
                "tax_percent": db_estimate.tax_percent,
                "tax_amount": db_estimate.tax_amount,
                "advance": db_estimate.advance,
                "total_with_tax": db_estimate.total_with_tax,
                "final": db_estimate.final,
                "profit": db_estimate.profit,
                "currency_code": db_estimate.currency_code,
                "exchange_rate": db_estimate.exchange_rate,
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

    # Regenerate PDF after update so the latest data is reflected.
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
                    "category": item.category,
                    "description": item.description,
                    "size": item.size,
                    "sft": item.sft,
                    "rate": item.rate,
                    "cost_rate": item.cost_rate,
                    "amount": item.amount,
                    "total": item.total,
                    "cost_amount": item.cost_amount,
                    "profit": item.profit,
                    "margin_percent": item.margin_percent
                } for item in db_estimate.items],
                "gross": db_estimate.gross,
                "discount": db_estimate.discount,
                "tax_percent": db_estimate.tax_percent,
                "tax_amount": db_estimate.tax_amount,
                "advance": db_estimate.advance,
                "total_with_tax": db_estimate.total_with_tax,
                "final": db_estimate.final,
                "profit": db_estimate.profit,
                "currency_code": db_estimate.currency_code,
                "exchange_rate": db_estimate.exchange_rate,
            },
            db_estimate.id
        )
        db_estimate.pdf_url = f"http://localhost:8000/{pdf_path}"
    except Exception as e:
        print(f"PDF regeneration failed: {e}")

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
        version = int(os.path.getmtime(pdf_path))
        return {"pdf_url": f"http://localhost:8000/generated_pdfs/{pdf_filename}?v={version}"}
    else:
        raise HTTPException(status_code=404, detail="PDF not found")

@app.post("/api/estimates/{estimate_id}/duplicate", response_model=EstimateResponse)
def duplicate_estimate_detail(estimate_id: int, db: Session = Depends(get_db)):
    """Duplicate an estimate and return the new one"""
    db_estimate = duplicate_estimate(db, estimate_id)
    if not db_estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")

    # Generate PDF for duplicated estimate
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
                    "category": item.category,
                    "description": item.description,
                    "size": item.size,
                    "sft": item.sft,
                    "rate": item.rate,
                    "cost_rate": item.cost_rate,
                    "amount": item.amount,
                    "total": item.total,
                    "cost_amount": item.cost_amount,
                    "profit": item.profit,
                    "margin_percent": item.margin_percent
                } for item in db_estimate.items],
                "gross": db_estimate.gross,
                "discount": db_estimate.discount,
                "tax_percent": db_estimate.tax_percent,
                "tax_amount": db_estimate.tax_amount,
                "advance": db_estimate.advance,
                "total_with_tax": db_estimate.total_with_tax,
                "final": db_estimate.final,
                "profit": db_estimate.profit,
                "currency_code": db_estimate.currency_code,
                "exchange_rate": db_estimate.exchange_rate,
            },
            db_estimate.id
        )
        db_estimate.pdf_url = f"http://localhost:8000/{pdf_path}"
    except Exception as e:
        print(f"PDF generation failed: {e}")

    return db_estimate

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "ok"}

# ============== TEMPLATES ==============

@app.get("/api/templates", response_model=list[TemplateResponse])
def list_templates_api(db: Session = Depends(get_db)):
    templates = list_templates(db)
    for tpl in templates:
        try:
            tpl.data = json.loads(tpl.data)
        except Exception:
            tpl.data = {}
    return templates

@app.post("/api/templates", response_model=TemplateResponse)
def create_template_api(template: TemplateCreate, db: Session = Depends(get_db)):
    tpl = create_template(db, template)
    try:
        tpl.data = json.loads(tpl.data)
    except Exception:
        tpl.data = {}
    return tpl

@app.delete("/api/templates/{template_id}")
def delete_template_api(template_id: int, db: Session = Depends(get_db)):
    success = delete_template(db, template_id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}

# ============== EXPORTS ==============

@app.get("/api/estimates/export.csv")
def export_estimates_csv(db: Session = Depends(get_db)):
    estimates = get_all_estimates(db, skip=0, limit=10000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id",
        "party_name",
        "contractor_name",
        "date",
        "gross",
        "discount",
        "tax_percent",
        "tax_amount",
        "advance",
        "final",
        "profit",
        "currency_code",
        "exchange_rate",
    ])
    for e in estimates:
        writer.writerow([
            e.id,
            e.party_name,
            e.contractor_name,
            e.date.isoformat() if e.date else "",
            e.gross,
            e.discount,
            e.tax_percent,
            e.tax_amount,
            e.advance,
            e.final,
            e.profit,
            e.currency_code,
            e.exchange_rate,
        ])
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=estimates.csv"},
    )

@app.get("/api/estimates/{estimate_id}/items.csv")
def export_estimate_items_csv(estimate_id: int, db: Session = Depends(get_db)):
    estimate = get_estimate(db, estimate_id)
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "estimate_id",
        "serial_number",
        "category",
        "description",
        "size",
        "sft",
        "rate",
        "cost_rate",
        "amount",
        "total",
        "cost_amount",
        "profit",
        "margin_percent",
    ])
    for item in estimate.items:
        writer.writerow([
            estimate.id,
            item.serial_number,
            item.category,
            item.description,
            item.size,
            item.sft,
            item.rate,
            item.cost_rate,
            item.amount,
            item.total,
            item.cost_amount,
            item.profit,
            item.margin_percent,
        ])
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=estimate_{estimate_id}_items.csv"},
    )
