from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class EstimateItemCreate(BaseModel):
    serial_number: int
    description: str
    size: Optional[str] = None
    sft: Optional[float] = None
    rate: float = 0
    amount: Optional[float] = None  # calculated if not provided
    total: Optional[float] = None

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
    advance: float = 0
    notes: Optional[str] = None
    items: List[EstimateItemCreate] = Field(default_factory=list)

class EstimateUpdate(BaseModel):
    party_name: Optional[str] = None
    contractor_name: Optional[str] = None
    mobile_number: Optional[str] = None
    location: Optional[str] = None
    discount: Optional[float] = None
    advance: Optional[float] = None
    notes: Optional[str] = None
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
    advance: float
    final: float
    notes: Optional[str]
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

    class Config:
        from_attributes = True
