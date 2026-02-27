from sqlalchemy.orm import Session
from app.models import (
    Estimate,
    EstimateItem,
    AuditLog,
    Template,
    ProposalVersion,
    ClientPortalToken,
    ProposalComment,
    ShareLink,
    ShareClick,
    User,
    Vendor,
    VendorRate,
    WorkOrder,
    Invoice,
    Payment,
    ChangeRequest,
)
from app.schemas import EstimateCreate, EstimateUpdate, TemplateCreate
from datetime import datetime, timedelta
import json
import hashlib
import os
import secrets

def log_action(db: Session, entity: str, entity_id: int | None, action: str, payload: dict | None = None):
    try:
        log = AuditLog(
            entity=entity,
            entity_id=entity_id,
            action=action,
            payload=json.dumps(payload or {}, default=str),
        )
        db.add(log)
    except Exception:
        # Logging should never break core flow.
        pass

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return f"{salt.hex()}:{digest.hex()}"

def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt_hex, digest_hex = password_hash.split(":")
        salt = bytes.fromhex(salt_hex)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
        return digest.hex() == digest_hex
    except Exception:
        return False

def _item_amounts(item):
    amount = item.amount or (item.sft * item.rate if item.sft else 0)
    cost_amount = item.cost_amount or (item.sft * (item.cost_rate or 0) if item.sft else 0)
    return amount, cost_amount

def lookup_cost_rate(db: Session, vendor_name: str | None, category: str | None, item_type: str | None):
    if not vendor_name or not category:
        return None
    vendor = db.query(Vendor).filter(Vendor.name == vendor_name).first()
    if not vendor:
        return None
    rate = (
        db.query(VendorRate)
        .filter(
            VendorRate.vendor_id == vendor.id,
            VendorRate.category == category,
            VendorRate.item_type == (item_type or "material"),
        )
        .first()
    )
    if not rate:
        return None
    return rate.cost_rate or rate.rate

def calculate_financials(items_data, discount, advance, tax_percent):
    gross = 0
    cost_total = 0
    for item in items_data:
        amount, cost_amount = _item_amounts(item)
        gross += amount
        cost_total += cost_amount

    discount_amount = gross * (discount or 0) / 100
    tax_amount = gross * (tax_percent or 0) / 100
    total_with_tax = gross - discount_amount + tax_amount
    final = total_with_tax - (advance or 0)
    profit = gross - cost_total
    return gross, tax_amount, total_with_tax, final, profit

def create_estimate(db: Session, estimate: EstimateCreate) -> Estimate:
    """Create a new estimate with items"""
    items_data = estimate.items or []
    
    db_estimate = Estimate(
        party_name=estimate.party_name,
        contractor_name=estimate.contractor_name,
        mobile_number=estimate.mobile_number,
        location=estimate.location,
        date=estimate.date or datetime.now(),
        discount=estimate.discount,
        tax_percent=estimate.tax_percent,
        advance=estimate.advance,
        currency_code=estimate.currency_code,
        exchange_rate=estimate.exchange_rate,
        notes=estimate.notes,
        current_version=1,
        status=estimate.status or "draft",
        profit_alert_threshold=estimate.profit_alert_threshold or 15.0,
    )
    
    db.add(db_estimate)
    db.flush()  # Get the ID without committing
    
    # Add items
    for idx, item in enumerate(items_data, 1):
        # Calculate amount if not provided
        amount = item.amount or (item.sft * item.rate if item.sft else 0)
        resolved_cost_rate = item.cost_rate
        if not resolved_cost_rate:
            resolved_cost_rate = lookup_cost_rate(db, item.vendor_name, item.category, item.item_type) or 0
        cost_amount = item.cost_amount or (item.sft * (resolved_cost_rate or 0) if item.sft else 0)
        profit = amount - cost_amount
        margin_percent = 0
        if amount:
            margin_percent = (profit / amount) * 100

        db_item = EstimateItem(
            estimate_id=db_estimate.id,
            serial_number=item.serial_number or idx,
            category=item.category,
            item_type=item.item_type,
            vendor_name=item.vendor_name,
            description=item.description,
            size=item.size,
            sft=item.sft,
            rate=item.rate,
            cost_rate=resolved_cost_rate or 0,
            amount=amount,
            total=item.total or amount,
            cost_amount=cost_amount,
            profit=profit,
            margin_percent=margin_percent
        )
        db.add(db_item)
    
    # Calculate totals
    gross, tax_amount, total_with_tax, final, profit = calculate_financials(
        items_data,
        estimate.discount,
        estimate.advance,
        estimate.tax_percent,
    )
    db_estimate.gross = gross
    db_estimate.tax_amount = tax_amount
    db_estimate.total_with_tax = total_with_tax
    db_estimate.final = final
    db_estimate.profit = profit
    if gross > 0:
        margin = (profit / gross) * 100
        if margin < (db_estimate.profit_alert_threshold or 0):
            log_action(db, "estimate", db_estimate.id, "profit_alert", {"margin": margin})
    
    # Create proposal version snapshot
    version_data = serialize_estimate(db_estimate)
    db.add(
        ProposalVersion(
            estimate_id=db_estimate.id,
            version=1,
            data=json.dumps(version_data, default=str),
        )
    )

    db.commit()
    db.refresh(db_estimate)
    log_action(db, "estimate", db_estimate.id, "create", {"id": db_estimate.id})
    return db_estimate

def get_estimate(db: Session, estimate_id: int) -> Estimate:
    """Retrieve an estimate by ID"""
    return db.query(Estimate).filter(Estimate.id == estimate_id).first()

def get_all_estimates(db: Session, skip: int = 0, limit: int = 100):
    """Get all estimates with pagination"""
    return db.query(Estimate).offset(skip).limit(limit).all()

def update_estimate(db: Session, estimate_id: int, estimate_update: EstimateUpdate) -> Estimate:
    """Update an existing estimate"""
    db_estimate = get_estimate(db, estimate_id)
    
    if not db_estimate:
        return None
    
    # Update fields
    if estimate_update.party_name:
        db_estimate.party_name = estimate_update.party_name
    if estimate_update.contractor_name:
        db_estimate.contractor_name = estimate_update.contractor_name
    if estimate_update.mobile_number is not None:
        db_estimate.mobile_number = estimate_update.mobile_number
    if estimate_update.location:
        db_estimate.location = estimate_update.location
    if estimate_update.date is not None:
        db_estimate.date = estimate_update.date
    if estimate_update.discount is not None:
        db_estimate.discount = estimate_update.discount
    if estimate_update.tax_percent is not None:
        db_estimate.tax_percent = estimate_update.tax_percent
    if estimate_update.advance is not None:
        db_estimate.advance = estimate_update.advance
    if estimate_update.currency_code is not None:
        db_estimate.currency_code = estimate_update.currency_code
    if estimate_update.exchange_rate is not None:
        db_estimate.exchange_rate = estimate_update.exchange_rate
    if estimate_update.notes is not None:
        db_estimate.notes = estimate_update.notes
    if estimate_update.status is not None:
        db_estimate.status = estimate_update.status
        if estimate_update.status == "approved":
            db_estimate.approved_at = datetime.now()
    if estimate_update.profit_alert_threshold is not None:
        db_estimate.profit_alert_threshold = estimate_update.profit_alert_threshold
    
    # Update items if provided
    if estimate_update.items is not None:
        db_estimate.items.clear()
        for idx, item in enumerate(estimate_update.items, 1):
            amount = item.amount or (item.sft * item.rate if item.sft else 0)
            resolved_cost_rate = item.cost_rate
            if not resolved_cost_rate:
                resolved_cost_rate = lookup_cost_rate(db, item.vendor_name, item.category, item.item_type) or 0
            cost_amount = item.cost_amount or (item.sft * (resolved_cost_rate or 0) if item.sft else 0)
            profit = amount - cost_amount
            margin_percent = 0
            if amount:
                margin_percent = (profit / amount) * 100
            db_item = EstimateItem(
                estimate_id=db_estimate.id,
                serial_number=item.serial_number or idx,
                category=item.category,
                item_type=item.item_type,
                vendor_name=item.vendor_name,
                description=item.description,
                size=item.size,
                sft=item.sft,
                rate=item.rate,
                cost_rate=resolved_cost_rate or 0,
                amount=amount,
                total=item.total or amount,
                cost_amount=cost_amount,
                profit=profit,
                margin_percent=margin_percent
            )
            db.add(db_item)
        gross, tax_amount, total_with_tax, final, profit = calculate_financials(
            estimate_update.items,
            db_estimate.discount,
            db_estimate.advance,
            db_estimate.tax_percent,
        )
        db_estimate.gross = gross
        db_estimate.tax_amount = tax_amount
        db_estimate.total_with_tax = total_with_tax
        db_estimate.final = final
        db_estimate.profit = profit
        if gross > 0:
            margin = (profit / gross) * 100
            if margin < (db_estimate.profit_alert_threshold or 0):
                log_action(db, "estimate", db_estimate.id, "profit_alert", {"margin": margin})

    # Recalculate final in case discount/advance changed without items update.
    if estimate_update.items is None:
        _, tax_amount, total_with_tax, final, profit = calculate_financials(
            db_estimate.items,
            db_estimate.discount,
            db_estimate.advance,
            db_estimate.tax_percent,
        )
        db_estimate.tax_amount = tax_amount
        db_estimate.total_with_tax = total_with_tax
        db_estimate.final = final
        db_estimate.profit = profit
        if db_estimate.gross > 0:
            margin = (db_estimate.profit / db_estimate.gross) * 100
            if margin < (db_estimate.profit_alert_threshold or 0):
                log_action(db, "estimate", db_estimate.id, "profit_alert", {"margin": margin})
    
    # Increment version and store snapshot
    db_estimate.current_version = (db_estimate.current_version or 1) + 1
    version_data = serialize_estimate(db_estimate)
    db.add(
        ProposalVersion(
            estimate_id=db_estimate.id,
            version=db_estimate.current_version,
            data=json.dumps(version_data, default=str),
        )
    )

    db.commit()
    db.refresh(db_estimate)
    log_action(db, "estimate", db_estimate.id, "update", {"id": db_estimate.id})
    return db_estimate

def delete_estimate(db: Session, estimate_id: int) -> bool:
    """Delete an estimate"""
    db_estimate = get_estimate(db, estimate_id)
    if db_estimate:
        log_action(db, "estimate", db_estimate.id, "delete", {"id": db_estimate.id})
        db.delete(db_estimate)
        db.commit()
        return True
    return False

def duplicate_estimate(db: Session, estimate_id: int) -> Estimate:
    """Duplicate an estimate and its items, returning the new estimate."""
    original = get_estimate(db, estimate_id)
    if not original:
        return None

    new_estimate = Estimate(
        party_name=original.party_name,
        contractor_name=original.contractor_name,
        mobile_number=original.mobile_number,
        location=original.location,
        date=datetime.now(),
        discount=original.discount,
        tax_percent=original.tax_percent,
        advance=original.advance,
        currency_code=original.currency_code,
        exchange_rate=original.exchange_rate,
        notes=original.notes,
        current_version=1,
    )
    db.add(new_estimate)
    db.flush()

    gross = 0
    for idx, item in enumerate(original.items, 1):
        amount = item.amount or (item.sft * item.rate if item.sft else 0)
        cost_amount = item.cost_amount or (item.sft * (item.cost_rate or 0) if item.sft else 0)
        profit = amount - cost_amount
        margin_percent = 0
        if amount:
            margin_percent = (profit / amount) * 100
        db_item = EstimateItem(
            estimate_id=new_estimate.id,
            serial_number=item.serial_number or idx,
            category=item.category,
            description=item.description,
            size=item.size,
            sft=item.sft,
            rate=item.rate,
            cost_rate=item.cost_rate or 0,
            amount=amount,
            total=item.total or amount,
            cost_amount=cost_amount,
            profit=profit,
            margin_percent=margin_percent,
        )
        db.add(db_item)

    gross, tax_amount, total_with_tax, final, profit = calculate_financials(
        original.items,
        new_estimate.discount,
        new_estimate.advance,
        new_estimate.tax_percent,
    )
    new_estimate.gross = gross
    new_estimate.tax_amount = tax_amount
    new_estimate.total_with_tax = total_with_tax
    new_estimate.final = final
    new_estimate.profit = profit

    db.add(
        ProposalVersion(
            estimate_id=new_estimate.id,
            version=1,
            data=json.dumps(serialize_estimate(new_estimate), default=str),
        )
    )
    db.commit()
    db.refresh(new_estimate)
    log_action(db, "estimate", new_estimate.id, "duplicate", {"from_id": estimate_id})
    return new_estimate

def serialize_estimate(estimate: Estimate) -> dict:
    return {
        "id": estimate.id,
        "party_name": estimate.party_name,
        "contractor_name": estimate.contractor_name,
        "mobile_number": estimate.mobile_number,
        "location": estimate.location,
        "date": estimate.date,
        "discount": estimate.discount,
        "tax_percent": estimate.tax_percent,
        "advance": estimate.advance,
        "currency_code": estimate.currency_code,
        "exchange_rate": estimate.exchange_rate,
        "notes": estimate.notes,
        "status": estimate.status,
        "profit_alert_threshold": estimate.profit_alert_threshold,
        "gross": estimate.gross,
        "tax_amount": estimate.tax_amount,
        "total_with_tax": estimate.total_with_tax,
        "final": estimate.final,
        "profit": estimate.profit,
        "items": [
            {
                "serial_number": i.serial_number,
                "category": i.category,
                "item_type": i.item_type,
                "vendor_name": i.vendor_name,
                "description": i.description,
                "size": i.size,
                "sft": i.sft,
                "rate": i.rate,
                "cost_rate": i.cost_rate,
                "amount": i.amount,
                "total": i.total,
                "cost_amount": i.cost_amount,
                "profit": i.profit,
                "margin_percent": i.margin_percent,
            }
            for i in estimate.items
        ],
    }

def list_versions(db: Session, estimate_id: int):
    return (
        db.query(ProposalVersion)
        .filter(ProposalVersion.estimate_id == estimate_id)
        .order_by(ProposalVersion.version.desc())
        .all()
    )

def create_portal_token(db: Session, estimate_id: int, days: int = 30):
    token = secrets.token_urlsafe(24)
    expires_at = datetime.now() + timedelta(days=days)
    portal = ClientPortalToken(
        estimate_id=estimate_id,
        token=token,
        expires_at=expires_at,
    )
    db.add(portal)
    db.commit()
    db.refresh(portal)
    return portal

def get_portal_by_token(db: Session, token: str):
    return db.query(ClientPortalToken).filter(ClientPortalToken.token == token).first()

def add_comment(db: Session, estimate_id: int, author: str | None, message: str):
    comment = ProposalComment(estimate_id=estimate_id, author=author, message=message)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment

def list_comments(db: Session, estimate_id: int):
    return (
        db.query(ProposalComment)
        .filter(ProposalComment.estimate_id == estimate_id)
        .order_by(ProposalComment.id.desc())
        .all()
    )

def create_share_link(db: Session, estimate_id: int, channel: str):
    token = secrets.token_urlsafe(18)
    link = ShareLink(estimate_id=estimate_id, channel=channel, token=token)
    db.add(link)
    db.commit()
    db.refresh(link)
    return link

def record_share_click(db: Session, token: str, user_agent: str | None, ip: str | None):
    link = db.query(ShareLink).filter(ShareLink.token == token).first()
    if not link:
        return None
    link.click_count = (link.click_count or 0) + 1
    link.last_clicked_at = datetime.now()
    db.add(ShareClick(share_link_id=link.id, user_agent=user_agent, ip=ip))
    db.commit()
    db.refresh(link)
    return link

def create_user(db: Session, email: str, password: str, role: str = "estimator"):
    user = User(email=email, password_hash=hash_password(password), role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def create_vendor(db: Session, name: str, contact: str | None):
    vendor = Vendor(name=name, contact=contact)
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    log_action(db, "vendor", vendor.id, "create", {"name": name})
    return vendor

def list_vendors(db: Session):
    return db.query(Vendor).order_by(Vendor.id.desc()).all()

def create_vendor_rate(db: Session, vendor_id: int, category: str, item_type: str, rate: float, cost_rate: float):
    vr = VendorRate(
        vendor_id=vendor_id,
        category=category,
        item_type=item_type or "material",
        rate=rate,
        cost_rate=cost_rate,
    )
    db.add(vr)
    db.commit()
    db.refresh(vr)
    log_action(db, "vendor_rate", vr.id, "create", {"vendor_id": vendor_id})
    return vr

def list_vendor_rates(db: Session, vendor_id: int | None = None):
    q = db.query(VendorRate)
    if vendor_id:
        q = q.filter(VendorRate.vendor_id == vendor_id)
    return q.order_by(VendorRate.id.desc()).all()

def create_work_order(db: Session, estimate_id: int):
    wo = WorkOrder(estimate_id=estimate_id, status="open")
    db.add(wo)
    db.commit()
    db.refresh(wo)
    log_action(db, "work_order", wo.id, "create", {"estimate_id": estimate_id})
    return wo

def list_work_orders(db: Session, estimate_id: int | None = None):
    q = db.query(WorkOrder)
    if estimate_id:
        q = q.filter(WorkOrder.estimate_id == estimate_id)
    return q.order_by(WorkOrder.id.desc()).all()

def create_invoice(db: Session, estimate_id: int, work_order_id: int | None, total: float):
    inv = Invoice(estimate_id=estimate_id, work_order_id=work_order_id, total=total, paid=0, status="unpaid")
    db.add(inv)
    db.commit()
    db.refresh(inv)
    log_action(db, "invoice", inv.id, "create", {"estimate_id": estimate_id})
    return inv

def list_invoices(db: Session, estimate_id: int | None = None):
    q = db.query(Invoice)
    if estimate_id:
        q = q.filter(Invoice.estimate_id == estimate_id)
    return q.order_by(Invoice.id.desc()).all()

def add_payment(db: Session, invoice_id: int, amount: float, method: str | None, note: str | None):
    payment = Payment(invoice_id=invoice_id, amount=amount, method=method, note=note)
    db.add(payment)
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if invoice:
        invoice.paid = (invoice.paid or 0) + amount
        invoice.status = "paid" if invoice.paid >= invoice.total else "partial"
    db.commit()
    db.refresh(payment)
    log_action(db, "payment", payment.id, "create", {"invoice_id": invoice_id, "amount": amount})
    return payment

def list_payments(db: Session, invoice_id: int | None = None, estimate_id: int | None = None):
    q = db.query(Payment)
    if invoice_id:
        q = q.filter(Payment.invoice_id == invoice_id)
    if estimate_id:
        q = q.join(Invoice).filter(Invoice.estimate_id == estimate_id)
    return q.order_by(Payment.id.desc()).all()

def create_change_request(db: Session, estimate_id: int, title: str, details: str):
    cr = ChangeRequest(estimate_id=estimate_id, title=title, details=details, status="pending")
    db.add(cr)
    db.commit()
    db.refresh(cr)
    log_action(db, "change_request", cr.id, "create", {"estimate_id": estimate_id})
    return cr

def list_change_requests(db: Session, estimate_id: int | None = None):
    q = db.query(ChangeRequest)
    if estimate_id:
        q = q.filter(ChangeRequest.estimate_id == estimate_id)
    return q.order_by(ChangeRequest.id.desc()).all()

def authenticate_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

def list_templates(db: Session):
    return db.query(Template).order_by(Template.id.desc()).all()

def get_template(db: Session, template_id: int):
    return db.query(Template).filter(Template.id == template_id).first()

def create_template(db: Session, template: TemplateCreate):
    tpl = Template(
        name=template.name,
        description=template.description,
        data=json.dumps(template.data, default=str),
    )
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    log_action(db, "template", tpl.id, "create", {"id": tpl.id})
    return tpl

def delete_template(db: Session, template_id: int) -> bool:
    tpl = get_template(db, template_id)
    if not tpl:
        return False
    log_action(db, "template", template_id, "delete", {"id": template_id})
    db.delete(tpl)
    db.commit()
    return True
