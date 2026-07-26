#input_type_name: ApplyKbSuggestionInput
#output_type_name: ApplyKbSuggestionResult
#function_name: apply_kb_suggestion

from typing import Optional
from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class ApplyKbSuggestionInput(BaseModel):
    suggestion_id: str
    has_gap: bool
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    reason: Optional[str] = None


class ApplyKbSuggestionResult(BaseModel):
    ok: bool
    suggestion_id: str
    status: str


async def apply_kb_suggestion(ctx: FunctionContext, data: ApplyKbSuggestionInput) -> ApplyKbSuggestionResult:
    """Persist the learning-agent's judgment onto the kb_suggestions row. Real gaps go
    to 'pending' for an operator to approve; everything else is auto-dismissed so the
    review queue only ever shows genuine, reusable documentation gaps."""
    pod = Pod.from_env()
    suggestions = pod.table("kb_suggestions")

    if data.has_gap and data.title and data.content and data.category:
        suggestions.update(data.suggestion_id, {
            "status": "pending",
            "title": data.title,
            "content": data.content,
            "category": data.category,
            "reason": data.reason or "",
        })
        status = "pending"
    else:
        suggestions.update(data.suggestion_id, {
            "status": "dismissed",
            "reason": data.reason or "Not a reusable knowledge gap",
        })
        status = "dismissed"

    return ApplyKbSuggestionResult(ok=True, suggestion_id=data.suggestion_id, status=status)
