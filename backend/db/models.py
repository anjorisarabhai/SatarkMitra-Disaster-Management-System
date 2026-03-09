from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class CitizenReport(BaseModel):
    type: str
    description: str = Field(..., min_length=3)
    latitude: float
    longitude: float
    source: str = "citizen"


class StoredReport(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    type: str
    description: str
    location: dict
    source: str
    verification_status: str
    created_at: datetime = Field(default_factory=datetime.utcnow)