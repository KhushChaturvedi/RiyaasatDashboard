from fastapi import APIRouter, HTTPException
from models.schemas import APIResponse, ColumnMappingPayload
from services.supabase_client import get_supabase
from datetime import datetime, timezone

router = APIRouter(prefix="/api", tags=["sync"])


@router.get("/column-mapping", response_model=APIResponse)
def get_column_mapping():
    try:
        sb = get_supabase()
        resp = sb.table("column_mapping").select("*").order("updated_at", desc=True).limit(1).execute()
        data = resp.data[0] if resp.data else None
        return APIResponse(success=True, data={"mapping": data["mapping"] if data else {}})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/column-mapping", response_model=APIResponse)
def save_column_mapping(payload: ColumnMappingPayload):
    try:
        sb = get_supabase()
        sb.table("column_mapping").upsert({
            "id": 1,
            "mapping": payload.mapping,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
        return APIResponse(success=True, data={"message": "Column mapping saved."})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
