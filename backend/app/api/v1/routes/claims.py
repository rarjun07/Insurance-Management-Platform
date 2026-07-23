from fastapi import APIRouter


router = APIRouter()


@router.get("/")
def list_claims() -> dict[str, str]:
    return {"module": "claim management", "status": "planned"}
