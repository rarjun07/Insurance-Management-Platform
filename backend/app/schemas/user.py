from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class UserBase(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    role: UserRole = UserRole.CUSTOMER
    customer_id: int | None = Field(default=None, gt=0)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)
    phone: str | None = Field(default=None, min_length=10, max_length=20)
    address: str | None = Field(default=None, min_length=5, max_length=255)


class UserRead(UserBase):
    id: int
    profile_image_url: str | None = None

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str
    role: UserRole


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetRequestResponse(BaseModel):
    message: str
    reset_token: str | None = None


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=20)
    password: str = Field(min_length=8, max_length=128)
