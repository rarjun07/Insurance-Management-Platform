from fastapi import APIRouter


router = APIRouter()


@router.get("/")
def list_customers() -> dict[str, str]:
    return {"module": "customer management", "status": "planned"}
