from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean
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
    current_version = Column(Integer, default=1)
    status = Column(String, default="draft")  # draft, sent, approved, rejected, invoiced
    approved_at = Column(DateTime, nullable=True)
    profit_alert_threshold = Column(Float, default=15.0)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    items = relationship("EstimateItem", back_populates="estimate", cascade="all, delete-orphan")
    versions = relationship("ProposalVersion", back_populates="estimate", cascade="all, delete-orphan")

class EstimateItem(Base):
    __tablename__ = "estimate_items"
    id = Column(Integer, primary_key=True)
    estimate_id = Column(Integer, ForeignKey("estimates.id"))
    
    # Item details
    serial_number = Column(Integer)
    category = Column(String)
    item_type = Column(String, default="material")  # material or labor
    vendor_name = Column(String)
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

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="estimator")  # manager, estimator, viewer
    created_at = Column(DateTime, default=datetime.now)

class ProposalVersion(Base):
    __tablename__ = "proposal_versions"
    id = Column(Integer, primary_key=True)
    estimate_id = Column(Integer, ForeignKey("estimates.id"))
    version = Column(Integer, nullable=False)
    data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    estimate = relationship("Estimate", back_populates="versions")

class ClientPortalToken(Base):
    __tablename__ = "client_portal_tokens"
    id = Column(Integer, primary_key=True)
    estimate_id = Column(Integer, ForeignKey("estimates.id"))
    token = Column(String, unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

class ProposalComment(Base):
    __tablename__ = "proposal_comments"
    id = Column(Integer, primary_key=True)
    estimate_id = Column(Integer, ForeignKey("estimates.id"))
    author = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.now)

class ShareLink(Base):
    __tablename__ = "share_links"
    id = Column(Integer, primary_key=True)
    estimate_id = Column(Integer, ForeignKey("estimates.id"))
    channel = Column(String, nullable=False)
    token = Column(String, unique=True, nullable=False)
    click_count = Column(Integer, default=0)
    last_clicked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

class ShareClick(Base):
    __tablename__ = "share_clicks"
    id = Column(Integer, primary_key=True)
    share_link_id = Column(Integer, ForeignKey("share_links.id"))
    clicked_at = Column(DateTime, default=datetime.now)
    user_agent = Column(Text, nullable=True)
    ip = Column(String, nullable=True)

class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    contact = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

class VendorRate(Base):
    __tablename__ = "vendor_rates"
    id = Column(Integer, primary_key=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    category = Column(String, nullable=False)
    item_type = Column(String, default="material")
    rate = Column(Float, default=0)
    cost_rate = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.now)

class WorkOrder(Base):
    __tablename__ = "work_orders"
    id = Column(Integer, primary_key=True)
    estimate_id = Column(Integer, ForeignKey("estimates.id"))
    status = Column(String, default="open")
    created_at = Column(DateTime, default=datetime.now)

class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True)
    estimate_id = Column(Integer, ForeignKey("estimates.id"))
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=True)
    total = Column(Float, default=0)
    paid = Column(Float, default=0)
    status = Column(String, default="unpaid")
    created_at = Column(DateTime, default=datetime.now)

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    amount = Column(Float, default=0)
    method = Column(String, nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

class ChangeRequest(Base):
    __tablename__ = "change_requests"
    id = Column(Integer, primary_key=True)
    estimate_id = Column(Integer, ForeignKey("estimates.id"))
    title = Column(String, nullable=False)
    details = Column(Text, nullable=False)
    status = Column(String, default="pending")  # pending, approved, rejected
    created_at = Column(DateTime, default=datetime.now)
