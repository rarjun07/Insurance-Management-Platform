from pathlib import Path
from shutil import copyfileobj
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, require_roles
from app.core.config import settings
from app.db.session import get_db
from app.models.customer import Customer
from app.models.document import Document
from app.models.policy import Policy
from app.models.user import User, UserRole
from app.schemas.pagination import PaginatedResponse
from app.schemas.document import DocumentRead, DocumentUploadResponse

router = APIRouter()


AuthenticatedUser = Annotated[User, Depends(get_current_user)]
AdminOrAgent = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.AGENT))]

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
) -> Document:
    if document_type not in ALLOWED_DOCUMENT_TYPES:
        allowed = ", ".join(sorted(ALLOWED_DOCUMENT_TYPES))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type. Allowed document types: {allowed}",
        )

    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    if policy_id is not None:
        policy = db.get(Policy, policy_id)
        if policy is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
        if policy.customer_id != customer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Policy does not belong to this customer",
            )

    original_name = validate_upload_file(file)
    storage_path = build_storage_path(original_name)

    with storage_path.open("wb") as destination:
        copyfileobj(file.file, destination)

    document = Document(
        customer_id=customer_id,
        policy_id=policy_id,
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
    current_user: AdminOrAgent,
    customer_id: Annotated[int | None, Query(gt=0)] = None,
    policy_id: Annotated[int | None, Query(gt=0)] = None,
    document_type: Annotated[str | None, Query()] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[DocumentRead]:
    query = db.query(Document)
    if customer_id:
        query = query.filter(Document.customer_id == customer_id)
    if policy_id:
        query = query.filter(Document.policy_id == policy_id)
    if document_type:
        query = query.filter(Document.document_type == document_type)

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

    file_path = Path(document.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored file not found")

    return FileResponse(path=file_path, filename=document.file_name)
