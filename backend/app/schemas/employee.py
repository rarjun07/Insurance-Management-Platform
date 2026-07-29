from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class EmployeeCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole


class EmployeeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role: UserRole | None = None


class EmployeeRead(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    customer_id: int | None

    model_config = {"from_attributes": True}
