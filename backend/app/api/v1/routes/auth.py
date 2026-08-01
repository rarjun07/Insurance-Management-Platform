from typing import Annotated
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import EmailStr
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.config import settings
from jose import JWTError, jwt

from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.customer import Customer
from app.models.system_setting import SystemSetting
from app.models.user import User, UserRole
from app.schemas.profile import ProfileUpdate
from app.schemas.user import PasswordResetConfirm, PasswordResetRequest, PasswordResetRequestResponse, Token, UserCreate, UserRead

router = APIRouter()

ALLOWED_PROFILE_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024
PASSWORD_RESET_MESSAGE = "If an account exists for this email, password reset instructions are ready."


@router.get("/status")
def auth_status() -> dict[str, str]:
    return {"module": "authentication", "status": "ready"}


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, db: Annotated[Session, Depends(get_db)]) -> User:
    return create_customer_user(user_data, db)


@router.post("/register-with-image", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user_with_image(
    db: Annotated[Session, Depends(get_db)],
    name: Annotated[str, Form(min_length=2, max_length=100)],
    email: Annotated[EmailStr, Form()],
    password: Annotated[str, Form(min_length=8, max_length=128)],
    profile_image: Annotated[UploadFile, File()],
    phone: Annotated[str | None, Form(min_length=10, max_length=20)] = None,
    address: Annotated[str | None, Form(min_length=5, max_length=255)] = None,
) -> User:
    image_path = save_profile_image(profile_image)
    try:
        return create_customer_user(
            UserCreate(
                name=name,
                email=email,
                password=password,
                role=UserRole.CUSTOMER,
                phone=phone,
                address=address,
            ),
            db,
            profile_image_path=image_path,
        )
    except Exception:
        (Path(settings.UPLOAD_DIR) / image_path).unlink(missing_ok=True)
        raise


def save_profile_image(profile_image: UploadFile) -> str:
    extension = ALLOWED_PROFILE_IMAGE_TYPES.get(profile_image.content_type or "")
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile image must be a JPG, PNG, or WebP file.",
        )

    image_bytes = profile_image.file.read(MAX_PROFILE_IMAGE_BYTES + 1)
    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Profile image is empty.")
    if len(image_bytes) > MAX_PROFILE_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Profile image must be 5 MB or smaller.",
        )
    if not has_valid_image_signature(image_bytes, extension):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The selected file is not a valid profile image.",
        )

    relative_path = Path("profiles") / f"{uuid4().hex}{extension}"
    storage_path = Path(settings.UPLOAD_DIR) / relative_path
    storage_path.parent.mkdir(parents=True, exist_ok=True)
    storage_path.write_bytes(image_bytes)
    return relative_path.as_posix()


def has_valid_image_signature(image_bytes: bytes, extension: str) -> bool:
    if extension == ".jpg":
        return image_bytes.startswith(b"\xff\xd8\xff")
    if extension == ".png":
        return image_bytes.startswith(b"\x89PNG\r\n\x1a\n")
    if extension == ".webp":
        return (
            len(image_bytes) >= 12
            and image_bytes.startswith(b"RIFF")
            and image_bytes[8:12] == b"WEBP"
        )
    return False


def create_customer_user(
    user_data: UserCreate,
    db: Session,
    profile_image_path: str | None = None,
) -> User:
    registration_setting = (
        db.query(SystemSetting)
        .filter(SystemSetting.key == "allow_public_registration")
        .first()
    )
    if registration_setting is not None and registration_setting.value.lower() != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public customer registration is currently disabled. Please contact support.",
        )
    if user_data.role != UserRole.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public registration is available only for customers. Staff accounts must be created by an administrator.",
        )

    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )
    if user_data.customer_id is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer profiles are linked securely by email; a customer ID cannot be claimed during public registration.",
        )

    existing_customer = db.query(Customer).filter(Customer.email == user_data.email).first()
    if existing_customer:
        customer_id = existing_customer.id
    else:
        customer = Customer(
            name=user_data.name,
            email=user_data.email,
            phone=user_data.phone or "0000000000",
            address=user_data.address or "Address not provided",
        )
        db.add(customer)
        db.flush()
        customer_id = customer.id

    user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role=user_data.role,
        customer_id=customer_id,
        profile_image_path=profile_image_path,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login_user(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
) -> Token:
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        subject=user.email,
        claims={"role": user.role.value, "customer_id": user.customer_id},
    )
    return Token(access_token=access_token)


@router.post("/forgot-password", response_model=PasswordResetRequestResponse)
def request_password_reset(
    payload: PasswordResetRequest,
    db: Annotated[Session, Depends(get_db)],
) -> PasswordResetRequestResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None:
        return PasswordResetRequestResponse(message=PASSWORD_RESET_MESSAGE)

    reset_token = create_access_token(subject=user.email, claims={"purpose": "password_reset"})
    return PasswordResetRequestResponse(message=PASSWORD_RESET_MESSAGE, reset_token=reset_token)


@router.post("/reset-password")
def reset_password(
    payload: PasswordResetConfirm,
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    try:
        token_payload = jwt.decode(payload.token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset link is invalid or expired.",
        ) from exc

    if token_payload.get("purpose") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset link is invalid or expired.",
        )

    email = token_payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset link is invalid or expired.",
        )

    user.hashed_password = hash_password(payload.password)
    db.commit()
    return {"message": "Password updated successfully. You can now log in with your new password."}


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user


@router.patch("/me", response_model=UserRead)
def update_my_profile(
    payload: ProfileUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    update_data = payload.model_dump(exclude_unset=True)
    customer = db.get(Customer, current_user.customer_id) if current_user.customer_id is not None else None

    if "email" in update_data:
        existing = db.query(User).filter(User.email == update_data["email"], User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
        current_user.email = update_data.pop("email")
        if customer is not None:
            customer.email = current_user.email

    if "password" in update_data:
        current_user.hashed_password = hash_password(update_data.pop("password"))

    if "name" in update_data:
        current_user.name = update_data.pop("name")
        if customer is not None:
            customer.name = current_user.name

    if customer is not None:
        if "phone" in update_data:
            customer.phone = update_data.pop("phone")
        if "address" in update_data:
            customer.address = update_data.pop("address")

    db.commit()
    db.refresh(current_user)
    return current_user
