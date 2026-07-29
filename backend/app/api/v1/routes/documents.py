from datetime import datetime
from pathlib import Path
from shutil import copyfileobj
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.dependencies import ensure_customer_access, get_current_user, require_roles
from app.core.config import settings
from app.db.session import get_db
from app.models.customer import Customer
from app.models.claim import Claim
from app.models.document import Document, DocumentVerificationStatus
from app.models.policy import Policy
from app.models.policy_application import PolicyApplication
from app.models.user import User, UserRole
from app.schemas.document import DocumentRead, DocumentUploadResponse, DocumentVerificationDecision
from app.schemas.pagination import PaginatedResponse

router = APIRouter()

AuthenticatedUser = Annotated[User, Depends(get_current_user)]
StaffOnly = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.AGENT))]

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
ALLOWED_DOCUMENT_TYPES = {"identity", "policy", "claim"}


def validate_upload_file(file: UploadFile) -> str:
    original_name = Path(file.filename or "").name
    extension = Path(original_name).suffix.lower()
    if not original_name or extension not in ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed file types: {allowed}",
        )
    return original_name


def build_storage_path(original_name: str) -> Path:
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    safe_name = original_name.replace(" ", "_")
    stored_name = f"{uuid4().hex}_{safe_name}"
    return upload_dir / stored_name


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
def upload_document(
    db: Annotated[Session, Depends(get_db)],
    current_user: AuthenticatedUser,
    customer_id: Annotated[int, Form(gt=0)],
    document_type: Annotated[str, Form()],
    file: Annotated[UploadFile, File()],
    policy_id: Annotated[int | None, Form(gt=0)] = None,
    application_id: Annotated[int | None, Form(gt=0)] = None,
    claim_id: Annotated[int | None, Form(gt=0)] = None,
) -> Document:
    if document_type not in ALLOWED_DOCUMENT_TYPES:
        allowed = ", ".join(sorted(ALLOWED_DOCUMENT_TYPES))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type. Allowed document types: {allowed}",
        )
    if document_type == "policy" and policy_id is None and application_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Policy documents must be linked to a policy or policy application",
        )
    if document_type == "claim" and claim_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Claim documents must be linked to a claim",
        )

    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    ensure_customer_access(current_user, customer.id)

    if policy_id is not None:
        policy = db.get(Policy, policy_id)
        if policy is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
        if policy.customer_id != customer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Policy does not belong to this customer",
            )

    if application_id is not None:
        application = db.get(PolicyApplication, application_id)
        if application is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy application not found")
        if application.customer_id != customer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Policy application does not belong to this customer",
            )

    if claim_id is not None:
        claim = db.get(Claim, claim_id)
        if claim is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")
        if claim.policy.customer_id != customer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Claim does not belong to this customer",
            )
        if policy_id is not None and claim.policy_id != policy_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Claim does not belong to the selected policy",
            )

    original_name = validate_upload_file(file)
    storage_path = build_storage_path(original_name)

    with storage_path.open("wb") as destination:
        copyfileobj(file.file, destination)

    document = Document(
        customer_id=customer_id,
        policy_id=policy_id,
        application_id=application_id,
        claim_id=claim_id,
        document_type=document_type,
        file_name=original_name,
        file_path=str(storage_path),
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.get("/", response_model=PaginatedResponse[DocumentRead])
def list_documents(
    db: Annotated[Session, Depends(get_db)],
    current_user: StaffOnly,
    customer_id: Annotated[int | None, Query(gt=0)] = None,
    policy_id: Annotated[int | None, Query(gt=0)] = None,
    application_id: Annotated[int | None, Query(gt=0)] = None,
    claim_id: Annotated[int | None, Query(gt=0)] = None,
    document_type: Annotated[str | None, Query()] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[DocumentRead]:
    query = db.query(Document)
    if customer_id:
        query = query.filter(Document.customer_id == customer_id)
    if policy_id:
        query = query.filter(Document.policy_id == policy_id)
    if application_id:
        query = query.filter(Document.application_id == application_id)
    if claim_id:
        query = query.filter(Document.claim_id == claim_id)
    if document_type:
        query = query.filter(Document.document_type == document_type)

    total = query.count()
    documents = query.order_by(Document.uploaded_at.desc()).offset(skip).limit(limit).all()
    return PaginatedResponse(items=documents, total=total, skip=skip, limit=limit)


@router.patch("/{document_id}/verify", response_model=DocumentRead)
def verify_document(
    document_id: int,
    payload: DocumentVerificationDecision,
    db: Annotated[Session, Depends(get_db)],
    current_user: StaffOnly,
) -> Document:
    if payload.verification_status == DocumentVerificationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification decision must be verified or rejected",
        )
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    document.verification_status = payload.verification_status
    document.verification_notes = payload.verification_notes
    document.verified_at = datetime.utcnow()
    document.verified_by = current_user.id
    db.commit()
    db.refresh(document)
    return document


@router.get("/mine", response_model=PaginatedResponse[DocumentRead])
def list_my_documents(
    db: Annotated[Session, Depends(get_db)],
    current_user: AuthenticatedUser,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[DocumentRead]:
    if current_user.customer_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not linked to a customer profile")

    query = db.query(Document).filter(Document.customer_id == current_user.customer_id)
    total = query.count()
    documents = query.order_by(Document.uploaded_at.desc()).offset(skip).limit(limit).all()
    return PaginatedResponse(items=documents, total=total, skip=skip, limit=limit)


@router.get("/{document_id}", response_model=DocumentRead)
def get_document(
    document_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: AuthenticatedUser,
) -> Document:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    ensure_customer_access(current_user, document.customer_id)
    return document


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: AuthenticatedUser,
) -> FileResponse:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    ensure_customer_access(current_user, document.customer_id)

    file_path = Path(document.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored file not found")

    return FileResponse(path=file_path, filename=document.file_name)
