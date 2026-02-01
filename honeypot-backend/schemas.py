from pydantic import BaseModel
from typing import List, Dict

class ScamRequest(BaseModel):
    message: str

class ScamResponse(BaseModel):
    scam_detected: bool
    confidence_score: float
    scam_category: str
    conversation_log: List[str]
    extracted_entities: Dict[str, list]
