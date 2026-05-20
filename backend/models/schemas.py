from pydantic import BaseModel
from typing import Any, Optional


class APIResponse(BaseModel):
    success: bool
    data: Any = None
    error: Optional[str] = None


class ColumnMappingPayload(BaseModel):
    mapping: dict[str, str]
