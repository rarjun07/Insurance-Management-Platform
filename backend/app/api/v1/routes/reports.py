from fastapi import APIRouter


router = APIRouter()


@router.get("/summary")
def reports_summary() -> dict[str, str]:
    return {"module": "reports dashboard", "status": "planned"}
