from fastapi import APIRouter

from app.api.v1.routes import applications, auth, claims, customers, documents, plans, policies, premiums, reports, settings, users


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])
api_router.include_router(plans.router, prefix="/plans", tags=["Insurance Plans"])
api_router.include_router(policies.router, prefix="/policies", tags=["Policies"])
api_router.include_router(applications.router, prefix="/applications", tags=["Applications"])
api_router.include_router(premiums.router, prefix="/premiums", tags=["Premiums"])
api_router.include_router(claims.router, prefix="/claims", tags=["Claims"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
