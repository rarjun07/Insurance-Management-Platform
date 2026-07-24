from pydantic import BaseModel


class ErrorDetail(BaseModel):
    status_code: int
    message: str
    details: object | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
