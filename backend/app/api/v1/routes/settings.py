from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from email_validator import EmailNotValidError, validate_email
from sqlalchemy.orm import Session

from app.api.dependencies import require_roles
from app.db.session import get_db
from app.models.system_setting import SystemSetting
from app.models.user import User, UserRole
from app.schemas.settings import SystemSettingRead, SystemSettingUpdate

router = APIRouter()

AdminOnly = Annotated[User, Depends(require_roles(UserRole.ADMIN))]

DEFAULT_SETTINGS = {
    "active_policy_type": ("Health Insurance", "Currently active insurance line in the platform."),
    "support_email": ("support@healthinsure.com", "Support contact shown to platform users."),
    "allow_public_registration": ("true", "Whether customers can create their own account from the public registration page."),
}


def ensure_defaults(db: Session) -> None:
    changed = False
    for key, (value, description) in DEFAULT_SETTINGS.items():
        existing = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if existing is None:
            db.add(SystemSetting(key=key, value=value, description=description))
            changed = True
        elif existing.description != description:
            existing.description = description
            changed = True
    if changed:
        db.commit()


@router.get("/", response_model=list[SystemSettingRead])
def list_settings(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> list[SystemSetting]:
    ensure_defaults(db)
    return db.query(SystemSetting).order_by(SystemSetting.key.asc()).all()


@router.put("/{key}", response_model=SystemSettingRead)
def update_setting(
    key: str,
    payload: SystemSettingUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> SystemSetting:
    ensure_defaults(db)
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    value = payload.value.strip()
    if key == "active_policy_type" and value != "Health Insurance":
        raise HTTPException(
            status_code=400,
            detail="Version one supports Health Insurance only",
        )
    if key == "allow_public_registration":
        value = value.lower()
        if value not in {"true", "false"}:
            raise HTTPException(status_code=400, detail="Registration setting must be true or false")
    if key == "support_email":
        try:
            value = validate_email(value, check_deliverability=False).normalized
        except EmailNotValidError as exc:
            raise HTTPException(status_code=400, detail="Enter a valid support email") from exc

    setting.value = value
    if payload.description is not None:
        setting.description = payload.description
    setting.updated_by = current_user.id
    db.commit()
    db.refresh(setting)
    return setting
