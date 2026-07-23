from fastapi import APIRouter


router = APIRouter()


@router.get("/")
def list_premium_payments() -> dict[str, str]:
    return {"module": "premium tracking", "status": "planned"}
