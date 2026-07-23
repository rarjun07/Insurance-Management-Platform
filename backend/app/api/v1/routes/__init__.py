from fastapi import APIRouter

from app.api.v1.routes import auth, claims, customers, documents, policies, premiums, reports


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])
api_router.include_router(policies.router, prefix="/policies", tags=["Policies"])
api_router.include_router(premiums.router, prefix="/premiums", tags=["Premiums"])
api_router.include_router(claims.router, prefix="/claims", tags=["Claims"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
