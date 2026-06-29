#input_type_name: ApplyDraftInput
#output_type_name: ApplyDraftResult
#function_name: apply_draft

from typing import Optional, List
from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class ApplyDraftInput(BaseModel):
    ticket_id: str
    draft_response: str
    confidence_score: float
    kb_titles: Optional[List[str]] = None


class ApplyDraftResult(BaseModel):
    ok: bool
    ticket_id: str
    response_id: Optional[str] = None


async def apply_draft(ctx: FunctionContext, data: ApplyDraftInput) -> ApplyDraftResult:
    """Persist the draft-agent's grounded response + confidence onto the ticket and
    log a row in the responses audit table."""
    pod = Pod.from_env()

    pod.table("tickets").update(data.ticket_id, {
        "draft_response": data.draft_response,
        "confidence_score": float(data.confidence_score),
        "kb_articles_used": data.kb_titles or [],
        "status": "draft_ready",
    })

    response_id: Optional[str] = None
    try:
        created = pod.table("responses").create({
            "ticket_id": data.ticket_id,
            "draft": data.draft_response,
        })
        response_id = (created or {}).get("id")
    except Exception:
        pass

    return ApplyDraftResult(ok=True, ticket_id=data.ticket_id, response_id=response_id)
