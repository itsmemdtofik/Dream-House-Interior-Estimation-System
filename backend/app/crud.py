from sqlalchemy.orm import Session
from app.models import Estimate, EstimateItem, AuditLog, Template
from app.schemas import EstimateCreate, EstimateUpdate, TemplateCreate
from datetime import datetime
import json

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

def _item_amounts(item):
    amount = item.amount or (item.sft * item.rate if item.sft else 0)
    cost_amount = item.cost_amount or (item.sft * (item.cost_rate or 0) if item.sft else 0)
    return amount, cost_amount

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
        notes=estimate.notes
    )
    
    db.add(db_estimate)
    db.flush()  # Get the ID without committing
    
    # Add items
    for idx, item in enumerate(items_data, 1):
        # Calculate amount if not provided
        amount = item.amount or (item.sft * item.rate if item.sft else 0)
        cost_amount = item.cost_amount or (item.sft * (item.cost_rate or 0) if item.sft else 0)
        profit = amount - cost_amount
        margin_percent = 0
        if amount:
            margin_percent = (profit / amount) * 100

        db_item = EstimateItem(
            estimate_id=db_estimate.id,
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
    
    # Update items if provided
    if estimate_update.items is not None:
        db_estimate.items.clear()
        for idx, item in enumerate(estimate_update.items, 1):
            amount = item.amount or (item.sft * item.rate if item.sft else 0)
            cost_amount = item.cost_amount or (item.sft * (item.cost_rate or 0) if item.sft else 0)
            profit = amount - cost_amount
            margin_percent = 0
            if amount:
                margin_percent = (profit / amount) * 100
            db_item = EstimateItem(
                estimate_id=db_estimate.id,
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

    db.commit()
    db.refresh(new_estimate)
    log_action(db, "estimate", new_estimate.id, "duplicate", {"from_id": estimate_id})
    return new_estimate

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
