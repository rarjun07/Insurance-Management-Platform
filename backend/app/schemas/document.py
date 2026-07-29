from datetime import datetime

from pydantic import BaseModel, Field

from app.models.document import DocumentVerificationStatus


class DocumentRead(BaseModel):
    id: int
    customer_id: int
    policy_id: int | None
    application_id: int | None
    claim_id: int | None
    document_type: str
    file_name: str
    file_path: str
    uploaded_at: datetime
    verification_status: DocumentVerificationStatus
    verification_notes: str | None
    verified_at: datetime | None
    verified_by: int | None

    model_config = {"from_attributes": True}


class DocumentUploadResponse(DocumentRead):
    message: str = Field(default="Document uploaded successfully")


class DocumentVerificationDecision(BaseModel):
    verification_status: DocumentVerificationStatus
    verification_notes: str | None = Field(default=None, max_length=1000)
