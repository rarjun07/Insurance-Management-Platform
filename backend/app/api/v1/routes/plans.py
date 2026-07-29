from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_roles
from app.db.session import get_db
from app.models.insurance_plan import InsurancePlan
from app.models.user import User, UserRole
from app.schemas.insurance_plan import InsurancePlanCreate, InsurancePlanRead, InsurancePlanUpdate


router = APIRouter()
AdminOnly = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


@router.get("/", response_model=list[InsurancePlanRead])
def list_active_plans(db: Annotated[Session, Depends(get_db)]) -> list[InsurancePlan]:
    return (
        db.query(InsurancePlan)
        .filter(InsurancePlan.is_active.is_(True))
        .order_by(InsurancePlan.premium_amount.asc())
        .all()
    )


@router.get("/admin", response_model=list[InsurancePlanRead])
def list_all_plans(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> list[InsurancePlan]:
    return db.query(InsurancePlan).order_by(InsurancePlan.premium_amount.asc()).all()


@router.post("/", response_model=InsurancePlanRead, status_code=status.HTTP_201_CREATED)
def create_plan(
    payload: InsurancePlanCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> InsurancePlan:
    if db.query(InsurancePlan).filter(InsurancePlan.name == payload.name).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A plan with this name already exists")
    plan = InsurancePlan(**payload.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.put("/{plan_id}", response_model=InsurancePlanRead)
def update_plan(
    plan_id: int,
    payload: InsurancePlanUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOnly,
) -> InsurancePlan:
    plan = db.get(InsurancePlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Insurance plan not found")
    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        duplicate = (
            db.query(InsurancePlan)
            .filter(InsurancePlan.name == updates["name"], InsurancePlan.id != plan_id)
            .first()
        )
        if duplicate:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A plan with this name already exists")
    for field, value in updates.items():
        setattr(plan, field, value)
    db.commit()
    db.refresh(plan)
    return plan
