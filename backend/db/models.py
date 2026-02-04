from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CitizenReport(BaseModel):
    latitude: float
    longitude: float
    description: str

class StoredReport(CitizenReport):
    id: Optional[str] = Field(default=None, alias="_id")
    status: str = "PENDING"  # PENDING | VERIFIED | SUSPICIOUS
    verification_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
