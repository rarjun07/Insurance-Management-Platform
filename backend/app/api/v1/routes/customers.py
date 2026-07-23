from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.dependencies import require_roles
from app.db.session import get_db
from app.models.customer import Customer
from app.models.user import User, UserRole
from app.schemas.customer import CustomerCreate, CustomerHistory, CustomerRead, CustomerUpdate

router = APIRouter()


AdminOrAgent = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.AGENT))]


@router.post("/", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer_data: CustomerCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
) -> Customer:
    existing_customer = db.query(Customer).filter(Customer.email == customer_data.email).first()
    if existing_customer:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer email is already registered",
        )

    customer = Customer(**customer_data.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/", response_model=list[CustomerRead])
def list_customers(
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
    search: Annotated[str | None, Query(max_length=100)] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[Customer]:
    query = db.query(Customer)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Customer.name.ilike(search_pattern),
                Customer.email.ilike(search_pattern),
                Customer.phone.ilike(search_pattern),
            )
        )

    return query.order_by(Customer.id.desc()).offset(skip).limit(limit).all()


@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer(
    customer_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
) -> Customer:
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


@router.put("/{customer_id}", response_model=CustomerRead)
def update_customer(
    customer_id: int,
    customer_data: CustomerUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
) -> Customer:
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    update_data = customer_data.model_dump(exclude_unset=True)
    if "email" in update_data:
        existing_customer = (
            db.query(Customer)
            .filter(Customer.email == update_data["email"], Customer.id != customer_id)
            .first()
        )
        if existing_customer:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Customer email is already registered",
            )

    for field, value in update_data.items():
        setattr(customer, field, value)

    db.commit()
    db.refresh(customer)
    return customer


@router.get("/{customer_id}/history", response_model=CustomerHistory)
def get_customer_history(
    customer_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: AdminOrAgent,
) -> CustomerHistory:
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    return CustomerHistory(
        customer=customer,
        total_policies=len(customer.policies),
        total_documents=len(customer.documents),
    )
