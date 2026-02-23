from sqlalchemy.orm import Session
from app.models import Estimate, EstimateItem
from app.schemas import EstimateCreate, EstimateUpdate
from datetime import datetime

def create_estimate(db: Session, estimate: EstimateCreate) -> Estimate:
    """Create a new estimate with items"""
    # Calculate gross from items
    gross = 0
    items_data = estimate.items or []
    
    db_estimate = Estimate(
        party_name=estimate.party_name,
        contractor_name=estimate.contractor_name,
        mobile_number=estimate.mobile_number,
        location=estimate.location,
        date=estimate.date or datetime.now(),
        discount=estimate.discount,
        advance=estimate.advance,
        notes=estimate.notes
    )
    
    db.add(db_estimate)
    db.flush()  # Get the ID without committing
    
    # Add items
    for idx, item in enumerate(items_data, 1):
        # Calculate amount if not provided
        amount = item.amount or (item.sft * item.rate if item.sft else 0)
        
        db_item = EstimateItem(
            estimate_id=db_estimate.id,
            serial_number=item.serial_number or idx,
            description=item.description,
            size=item.size,
            sft=item.sft,
            rate=item.rate,
            amount=amount,
            total=item.total or amount
        )
        db.add(db_item)
        gross += amount
    
    # Calculate final amount
    db_estimate.gross = gross
    db_estimate.final = gross - (gross * estimate.discount / 100) - estimate.advance
    
    db.commit()
    db.refresh(db_estimate)
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
    if estimate_update.advance is not None:
        db_estimate.advance = estimate_update.advance
    if estimate_update.notes is not None:
        db_estimate.notes = estimate_update.notes
    
    # Update items if provided
    if estimate_update.items is not None:
        db_estimate.items.clear()
        gross = 0
        for idx, item in enumerate(estimate_update.items, 1):
            amount = item.amount or (item.sft * item.rate if item.sft else 0)
            db_item = EstimateItem(
                estimate_id=db_estimate.id,
                serial_number=item.serial_number or idx,
                description=item.description,
                size=item.size,
                sft=item.sft,
                rate=item.rate,
                amount=amount,
                total=item.total or amount
            )
            db.add(db_item)
            gross += amount
        db_estimate.gross = gross
        db_estimate.final = (
            gross - (gross * db_estimate.discount / 100) - db_estimate.advance
        )

    # Recalculate final in case discount/advance changed without items update.
    if estimate_update.items is None:
        db_estimate.final = (
            db_estimate.gross
            - (db_estimate.gross * db_estimate.discount / 100)
            - db_estimate.advance
        )
    
    db.commit()
    db.refresh(db_estimate)
    return db_estimate

def delete_estimate(db: Session, estimate_id: int) -> bool:
    """Delete an estimate"""
    db_estimate = get_estimate(db, estimate_id)
    if db_estimate:
        db.delete(db_estimate)
        db.commit()
        return True
    return False
