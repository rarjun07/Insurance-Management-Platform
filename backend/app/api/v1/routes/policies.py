from fastapi import APIRouter


router = APIRouter()


@router.get("/")
def list_policies() -> dict[str, str]:
    return {"module": "policy management", "status": "planned"}
