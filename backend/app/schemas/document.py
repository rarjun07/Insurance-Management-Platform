from datetime import datetime

from pydantic import BaseModel, Field


class DocumentRead(BaseModel):
    id: int
    customer_id: int
    policy_id: int | None
    document_type: str
    file_name: str
    file_path: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class DocumentUploadResponse(DocumentRead):
    message: str = Field(default="Document uploaded successfully")
