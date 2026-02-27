from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Estimate(Base):
    __tablename__ = "estimates"
    id = Column(Integer, primary_key=True)
    
    # Header info
    party_name = Column(String, nullable=False)
    contractor_name = Column(String, nullable=False)
    mobile_number = Column(String)
    location = Column(String)
    date = Column(DateTime, default=datetime.now)
    
    # Financial summary
    gross = Column(Float, default=0)
    discount = Column(Float, default=0)
    tax_percent = Column(Float, default=0)
    tax_amount = Column(Float, default=0)
    advance = Column(Float, default=0)
    total_with_tax = Column(Float, default=0)
    final = Column(Float, default=0)
    profit = Column(Float, default=0)

    # Currency
    currency_code = Column(String, default="INR")
    exchange_rate = Column(Float, default=1.0)  # rate to base currency (INR)
    
    # Metadata
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    items = relationship("EstimateItem", back_populates="estimate", cascade="all, delete-orphan")

class EstimateItem(Base):
    __tablename__ = "estimate_items"
    id = Column(Integer, primary_key=True)
    estimate_id = Column(Integer, ForeignKey("estimates.id"))
    
    # Item details
    serial_number = Column(Integer)
    category = Column(String)
    description = Column(String, nullable=False)
    size = Column(String)  # e.g., "9'-0\" x 7'-0\""
    
    # Calculations
    sft = Column(Float)  # Square Feet
    rate = Column(Float, default=0)
    cost_rate = Column(Float, default=0)
    amount = Column(Float, default=0)  # amount = sft * rate
    total = Column(Float, default=0)  # may differ from amount if custom
    cost_amount = Column(Float, default=0)
    profit = Column(Float, default=0)
    margin_percent = Column(Float, default=0)
    
    estimate = relationship("Estimate", back_populates="items")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    entity = Column(String, nullable=False)
    entity_id = Column(Integer, nullable=True)
    action = Column(String, nullable=False)
    payload = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

class Template(Base):
    __tablename__ = "templates"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
