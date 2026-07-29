from datetime import datetime

from pydantic import BaseModel, Field


class SystemSettingRead(BaseModel):
    key: str
    value: str
    description: str
    updated_at: datetime
    updated_by: int | None

    model_config = {"from_attributes": True}


class SystemSettingUpdate(BaseModel):
    value: str = Field(min_length=1, max_length=1000)
    description: str | None = Field(default=None, max_length=1000)
