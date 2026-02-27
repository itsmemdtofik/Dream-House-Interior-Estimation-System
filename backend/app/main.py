from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from app.database import engine, get_db, ensure_sqlite_schema, SessionLocal
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
    list_versions,
    serialize_estimate,
    create_portal_token,
    get_portal_by_token,
    list_comments,
    add_comment,
    create_share_link,
    record_share_click,
    create_user,
    authenticate_user,
    create_vendor,
    list_vendors,
    create_vendor_rate,
    list_vendor_rates,
    create_work_order,
    list_work_orders,
    create_invoice,
    list_invoices,
    add_payment,
    list_payments,
    create_change_request,
    list_change_requests,
)
from app.schemas import (
    EstimateCreate,
    EstimateUpdate,
    EstimateResponse,
    EstimateListResponse,
    TemplateCreate,
    TemplateResponse,
    UserCreate,
    UserResponse,
    PortalLinkResponse,
    CommentCreate,
    CommentResponse,
    ProposalVersionResponse,
    VendorCreate,
    VendorResponse,
    VendorRateCreate,
    VendorRateResponse,
    WorkOrderCreate,
    WorkOrderResponse,
    InvoiceCreate,
    InvoiceResponse,
    PaymentCreate,
    PaymentResponse,
    ChangeRequestCreate,
    ChangeRequestResponse,
)
from app.pdf.generator import generate_pdf
import os
import csv
import io
import json
import smtplib
from email.message import EmailMessage
import shutil
from datetime import datetime

# Create tables and ensure schema for SQLite
models.Base.metadata.create_all(bind=engine)
ensure_sqlite_schema(engine)

# Seed a default template if none exist (helps first-time UX).
def ensure_default_template():
    db = SessionLocal()
    try:
        existing = list_templates(db)
        if existing:
            return
        default_data = {
            "party_name": "",
            "contractor_name": "",
            "mobile_number": "",
            "location": "",
            "date": "",
            "discount": "0",
            "tax_percent": "0",
            "advance": "0",
            "currency_code": "INR",
            "exchange_rate": "1.0",
            "notes": "",
            "items": [
                {
                    "serial_number": 1,
                    "category": "Living Room",
                    "description": "TV Unit",
                    "size": "8'-0\"x10'-0\"",
                    "sft": "80",
                    "rate": "700",
                    "cost_rate": "500",
                    "amount": "",
                    "total": "",
                    "profit": "",
                }
            ],
        }
        create_template(db, TemplateCreate(name="Default Template", description="Sample starter template", data=default_data))
    finally:
        db.close()

ensure_default_template()

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

# ============== VENDORS & RATE CARDS ==============

@app.post("/api/vendors", response_model=VendorResponse)
def create_vendor_api(vendor: VendorCreate, db: Session = Depends(get_db)):
    return create_vendor(db, vendor.name, vendor.contact)

@app.get("/api/vendors", response_model=list[VendorResponse])
def list_vendors_api(db: Session = Depends(get_db)):
    return list_vendors(db)

@app.post("/api/vendor-rates", response_model=VendorRateResponse)
def create_vendor_rate_api(rate: VendorRateCreate, db: Session = Depends(get_db)):
    return create_vendor_rate(
        db,
        rate.vendor_id,
        rate.category,
        rate.item_type,
        rate.rate,
        rate.cost_rate,
    )

@app.get("/api/vendor-rates", response_model=list[VendorRateResponse])
def list_vendor_rates_api(vendor_id: int | None = None, db: Session = Depends(get_db)):
    return list_vendor_rates(db, vendor_id)

# ============== WORKFLOW ==============

@app.post("/api/work-orders", response_model=WorkOrderResponse)
def create_work_order_api(payload: WorkOrderCreate, db: Session = Depends(get_db)):
    return create_work_order(db, payload.estimate_id)

@app.get("/api/work-orders", response_model=list[WorkOrderResponse])
def list_work_orders_api(estimate_id: int | None = None, db: Session = Depends(get_db)):
    return list_work_orders(db, estimate_id)

@app.post("/api/invoices", response_model=InvoiceResponse)
def create_invoice_api(payload: InvoiceCreate, db: Session = Depends(get_db)):
    return create_invoice(db, payload.estimate_id, payload.work_order_id, payload.total)

@app.get("/api/invoices", response_model=list[InvoiceResponse])
def list_invoices_api(estimate_id: int | None = None, db: Session = Depends(get_db)):
    return list_invoices(db, estimate_id)

@app.post("/api/payments", response_model=PaymentResponse)
def add_payment_api(payload: PaymentCreate, db: Session = Depends(get_db)):
    return add_payment(db, payload.invoice_id, payload.amount, payload.method, payload.note)

@app.get("/api/payments", response_model=list[PaymentResponse])
def list_payments_api(
    invoice_id: int | None = None,
    estimate_id: int | None = None,
    db: Session = Depends(get_db),
):
    return list_payments(db, invoice_id=invoice_id, estimate_id=estimate_id)

@app.post("/api/change-requests", response_model=ChangeRequestResponse)
def create_change_request_api(payload: ChangeRequestCreate, db: Session = Depends(get_db)):
    return create_change_request(db, payload.estimate_id, payload.title, payload.details)

@app.get("/api/change-requests", response_model=list[ChangeRequestResponse])
def list_change_requests_api(estimate_id: int | None = None, db: Session = Depends(get_db)):
    return list_change_requests(db, estimate_id)

# ============== REPORTING ==============

@app.get("/api/reports/summary")
def report_summary(db: Session = Depends(get_db)):
    estimates = get_all_estimates(db, skip=0, limit=10000)
    by_month = {}
    top_clients = {}
    category_cost = {}

    for e in estimates:
        month_key = e.date.strftime("%Y-%m") if e.date else "unknown"
        by_month.setdefault(month_key, {"revenue": 0, "profit": 0})
        by_month[month_key]["revenue"] += e.final or 0
        by_month[month_key]["profit"] += e.profit or 0

        top_clients.setdefault(e.party_name, {"revenue": 0, "count": 0})
        top_clients[e.party_name]["revenue"] += e.final or 0
        top_clients[e.party_name]["count"] += 1

        for item in e.items:
            key = item.category or "Uncategorized"
            category_cost.setdefault(key, {"cost": 0, "amount": 0})
            category_cost[key]["cost"] += item.cost_amount or 0
            category_cost[key]["amount"] += item.amount or 0

    return {
        "monthly": by_month,
        "top_clients": top_clients,
        "category_cost": category_cost,
    }

# ============== BACKUPS ==============

@app.post("/api/admin/backup")
def backup_database():
    src = "estimation_system.db"
    if not os.path.exists(src):
        raise HTTPException(status_code=404, detail="Database not found")
    os.makedirs("backups", exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    dst = os.path.join("backups", f"estimation_system_{ts}.db")
    shutil.copy(src, dst)
    return {"backup": dst}

# ============== AUTH ==============

@app.post("/api/auth/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    return create_user(db, user.email, user.password, user.role)

@app.post("/api/auth/login", response_model=UserResponse)
def login_user(user: UserCreate, db: Session = Depends(get_db)):
    authenticated = authenticate_user(db, user.email, user.password)
    if not authenticated:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return authenticated

# ============== PROPOSAL VERSIONS ==============

@app.get("/api/estimates/{estimate_id}/versions", response_model=list[ProposalVersionResponse])
def get_versions(estimate_id: int, db: Session = Depends(get_db)):
    versions = list_versions(db, estimate_id)
    for v in versions:
        try:
            v.data = json.loads(v.data)
        except Exception:
            v.data = {}
    return versions

# ============== CLIENT PORTAL ==============

@app.post("/api/estimates/{estimate_id}/portal-link", response_model=PortalLinkResponse)
def create_portal_link(estimate_id: int, db: Session = Depends(get_db)):
    estimate = get_estimate(db, estimate_id)
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
    portal = create_portal_token(db, estimate_id)
    return {"url": f"http://localhost:8000/api/portal/{portal.token}"}

@app.get("/api/portal/{token}")
def get_portal(token: str, db: Session = Depends(get_db)):
    portal = get_portal_by_token(db, token)
    if not portal:
        raise HTTPException(status_code=404, detail="Portal link not found")
    estimate = get_estimate(db, portal.estimate_id)
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
    comments = []
    for c in list_comments(db, estimate.id):
        comments.append(
            {
                "id": c.id,
                "estimate_id": c.estimate_id,
                "author": c.author,
                "message": c.message,
                "created_at": c.created_at,
            }
        )
    return {
        "estimate": serialize_estimate(estimate),
        "versions": [json.loads(v.data) for v in list_versions(db, estimate.id)],
        "comments": comments,
    }

@app.post("/api/portal/{token}/comment", response_model=CommentResponse)
def add_portal_comment(token: str, comment: CommentCreate, db: Session = Depends(get_db)):
    portal = get_portal_by_token(db, token)
    if not portal:
        raise HTTPException(status_code=404, detail="Portal link not found")
    return add_comment(db, portal.estimate_id, comment.author, comment.message)

# ============== SHARE LINKS ==============

@app.post("/api/estimates/{estimate_id}/share-link")
def create_share(estimate_id: int, channel: str = "whatsapp", db: Session = Depends(get_db)):
    estimate = get_estimate(db, estimate_id)
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
    link = create_share_link(db, estimate_id, channel)
    return {"url": f"http://localhost:8000/api/share/{link.token}"}

@app.get("/api/share/{token}")
def track_share(token: str, request: Request, db: Session = Depends(get_db)):
    link = record_share_click(
        db,
        token,
        request.headers.get("user-agent"),
        request.client.host if request.client else None,
    )
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")
    portal = create_portal_token(db, link.estimate_id)
    return {"url": f"http://localhost:8000/api/portal/{portal.token}"}

# ============== EMAIL SENDING ==============

@app.post("/api/estimates/{estimate_id}/send-email")
def send_estimate_email(
    estimate_id: int,
    to_email: str,
    subject: str = "Your Proposal",
    message: str = "Please find your proposal at the link below.",
    db: Session = Depends(get_db),
):
    estimate = get_estimate(db, estimate_id)
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
    portal = create_portal_token(db, estimate_id)
    link = f"http://localhost:8000/api/portal/{portal.token}"

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)
    if not smtp_host or not smtp_user or not smtp_pass:
        raise HTTPException(status_code=400, detail="SMTP not configured")

    email = EmailMessage()
    email["From"] = smtp_from
    email["To"] = to_email
    email["Subject"] = subject
    email.set_content(f"{message}\n\nProposal Link: {link}")

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(email)

    return {"message": "Email sent", "link": link}

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
