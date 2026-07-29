from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.policy_application import PolicyApplicationStatus


class PolicyApplicationCreate(BaseModel):
    plan_id: int = Field(gt=0)
    plan_name: str = Field(min_length=2, max_length=100)
    policy_type: str = Field(default="Health Insurance", min_length=2, max_length=100)
    premium_amount: str = Field(min_length=1, max_length=50)
    coverage_amount: str = Field(min_length=1, max_length=50)
    applicant_name: str = Field(min_length=2, max_length=100)
    date_of_birth: date
    gender: str = Field(min_length=1, max_length=20)
    marital_status: str = Field(min_length=1, max_length=30)
    occupation: str = Field(min_length=1, max_length=100)
    address: str = Field(min_length=5, max_length=255)
    nominee_name: str = Field(min_length=2, max_length=100)
    nominee_relation: str = Field(min_length=1, max_length=50)
    nominee_age: int = Field(ge=0, le=120)
    height_cm: str = Field(min_length=1, max_length=20)
    weight_kg: str = Field(min_length=1, max_length=20)
    smoking: str = Field(min_length=1, max_length=10)
    alcohol: str = Field(min_length=1, max_length=10)
    previous_disease: str = Field(default="", max_length=500)
    current_medication: str = Field(default="", max_length=500)
    payment_method: str = Field(min_length=1, max_length=30)
    document_names: list[str] = Field(min_length=1)


class PolicyApplicationReview(BaseModel):
    status: PolicyApplicationStatus
    review_notes: str | None = Field(default=None, max_length=1000)


class PolicyApplicationRead(PolicyApplicationCreate):
    id: int
    customer_id: int
    status: PolicyApplicationStatus
    review_notes: str | None
    reviewed_at: datetime | None
    reviewed_by: int | None
    generated_policy_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}
