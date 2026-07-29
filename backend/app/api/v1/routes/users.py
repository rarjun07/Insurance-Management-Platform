from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_roles
from app.core.security import hash_password
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.employee import EmployeeCreate, EmployeeRead, EmployeeUpdate
from app.schemas.pagination import PaginatedResponse

router = APIRouter()

AdminOnly = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


@router.get("/", response_model=PaginatedResponse[EmployeeRead])
def list_users(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
    role: Annotated[UserRole | None, Query()] = None,
    search: Annotated[str | None, Query(max_length=100)] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[EmployeeRead]:
    if role == UserRole.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customers are managed through Customer Management, not Employee Management",
        )
    query = db.query(User).filter(User.role.in_([UserRole.ADMIN, UserRole.AGENT]))
    if role:
        query = query.filter(User.role == role)
    if search:
        pattern = f"%{search}%"
        query = query.filter((User.name.ilike(pattern)) | (User.email.ilike(pattern)))
    total = query.count()
    items = query.order_by(User.id.desc()).offset(skip).limit(limit).all()
    return PaginatedResponse(items=items, total=total, skip=skip, limit=limit)


@router.post("/", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: EmployeeCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> User:
    if payload.role == UserRole.CUSTOMER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Use public registration for customer accounts")
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=EmployeeRead)
def update_user(
    user_id: int,
    payload: EmployeeUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.role == UserRole.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )
    update_data = payload.model_dump(exclude_unset=True)
    if "email" in update_data:
        existing = db.query(User).filter(User.email == update_data["email"], User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
    if "role" in update_data and update_data["role"] == UserRole.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employees can only have admin or agent roles",
        )
    if "password" in update_data:
        user.hashed_password = hash_password(update_data.pop("password"))
    for field, value in update_data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user
