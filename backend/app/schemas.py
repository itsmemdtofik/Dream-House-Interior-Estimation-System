from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class EstimateItemCreate(BaseModel):
    serial_number: int
    category: Optional[str] = None
    item_type: Optional[str] = "material"
    vendor_name: Optional[str] = None
    description: str
    size: Optional[str] = None
    sft: Optional[float] = None
    rate: float = 0
    cost_rate: Optional[float] = None
    amount: Optional[float] = None  # calculated if not provided
    total: Optional[float] = None
    cost_amount: Optional[float] = None
    profit: Optional[float] = None
    margin_percent: Optional[float] = None

class EstimateItemResponse(EstimateItemCreate):
    id: int
    estimate_id: int

    class Config:
        from_attributes = True

class EstimateCreate(BaseModel):
    party_name: str
    contractor_name: str
    mobile_number: Optional[str] = None
    location: Optional[str] = None
    date: Optional[datetime] = None
    discount: float = 0
    tax_percent: float = 0
    advance: float = 0
    currency_code: str = "INR"
    exchange_rate: float = 1.0
    notes: Optional[str] = None
    status: Optional[str] = "draft"
    profit_alert_threshold: Optional[float] = 15.0
    items: List[EstimateItemCreate] = Field(default_factory=list)

class EstimateUpdate(BaseModel):
    party_name: Optional[str] = None
    contractor_name: Optional[str] = None
    mobile_number: Optional[str] = None
    location: Optional[str] = None
    date: Optional[datetime] = None
    discount: Optional[float] = None
    tax_percent: Optional[float] = None
    advance: Optional[float] = None
    currency_code: Optional[str] = None
    exchange_rate: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    profit_alert_threshold: Optional[float] = None
    items: Optional[List[EstimateItemCreate]] = None

class EstimateResponse(BaseModel):
    id: int
    party_name: str
    contractor_name: str
    mobile_number: Optional[str]
    location: Optional[str]
    date: datetime
    gross: float
    discount: float
    tax_percent: float
    tax_amount: float
    advance: float
    total_with_tax: float
    final: float
    profit: float
    currency_code: str
    exchange_rate: float
    notes: Optional[str]
    current_version: int
    status: str
    approved_at: Optional[datetime]
    profit_alert_threshold: float
    items: List[EstimateItemResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class EstimateListResponse(BaseModel):
    id: int
    party_name: str
    contractor_name: str
    date: datetime
    gross: float
    final: float
    currency_code: str

    class Config:
        from_attributes = True

class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    data: dict

class TemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    data: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: str
    password: str
    role: str = "estimator"

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class PortalLinkResponse(BaseModel):
    url: str

class CommentCreate(BaseModel):
    author: Optional[str] = None
    message: str

class CommentResponse(BaseModel):
    id: int
    estimate_id: int
    author: Optional[str]
    message: str
    created_at: datetime

    class Config:
        from_attributes = True

class ProposalVersionResponse(BaseModel):
    id: int
    estimate_id: int
    version: int
    data: dict
    created_at: datetime

    class Config:
        from_attributes = True

class VendorCreate(BaseModel):
    name: str
    contact: Optional[str] = None

class VendorResponse(BaseModel):
    id: int
    name: str
    contact: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class VendorRateCreate(BaseModel):
    vendor_id: int
    category: str
    item_type: str = "material"
    rate: float = 0
    cost_rate: float = 0

class VendorRateResponse(BaseModel):
    id: int
    vendor_id: int
    category: str
    item_type: str
    rate: float
    cost_rate: float
    created_at: datetime

    class Config:
        from_attributes = True

class WorkOrderCreate(BaseModel):
    estimate_id: int

class WorkOrderResponse(BaseModel):
    id: int
    estimate_id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class InvoiceCreate(BaseModel):
    estimate_id: int
    work_order_id: Optional[int] = None
    total: float

class InvoiceResponse(BaseModel):
    id: int
    estimate_id: int
    work_order_id: Optional[int]
    total: float
    paid: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class PaymentCreate(BaseModel):
    invoice_id: int
    amount: float
    method: Optional[str] = None
    note: Optional[str] = None

class PaymentResponse(BaseModel):
    id: int
    invoice_id: int
    amount: float
    method: Optional[str]
    note: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class ChangeRequestCreate(BaseModel):
    estimate_id: int
    title: str
    details: str

class ChangeRequestResponse(BaseModel):
    id: int
    estimate_id: int
    title: str
    details: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
