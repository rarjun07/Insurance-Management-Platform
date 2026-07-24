from datetime import date

from fastapi import HTTPException, status


def ensure_end_date_after_start_date(start_date: date, end_date: date) -> None:
    if end_date <= start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date",
        )


def ensure_allowed_value(value: str, allowed_values: set[str], field_name: str) -> None:
    if value not in allowed_values:
        allowed = ", ".join(sorted(allowed_values))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}. Allowed values: {allowed}",
        )
