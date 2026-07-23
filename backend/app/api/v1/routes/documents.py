from fastapi import APIRouter


router = APIRouter()


@router.get("/")
def list_documents() -> dict[str, str]:
    return {"module": "document management", "status": "planned"}
