from datetime import date

from pydantic import BaseModel, EmailStr, Field


class CustomerBase(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    dob: date | None = None
    phone: str = Field(min_length=10, max_length=20)
    address: str = Field(min_length=5, max_length=255)
    email: EmailStr


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    dob: date | None = None
    phone: str | None = Field(default=None, min_length=10, max_length=20)
    address: str | None = Field(default=None, min_length=5, max_length=255)
    email: EmailStr | None = None


class CustomerRead(CustomerBase):
    id: int

    model_config = {"from_attributes": True}


class CustomerHistory(BaseModel):
    customer: CustomerRead
    total_policies: int
    total_documents: int
