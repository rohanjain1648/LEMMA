#input_type_name: ApplyEscalationInput
#output_type_name: ApplyEscalationResult
#function_name: apply_escalation

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class ApplyEscalationInput(BaseModel):
    ticket_id: str
    decision: str  # "auto_send" | "human_review"


class ApplyEscalationResult(BaseModel):
    ok: bool
    ticket_id: str
    final_status: str


async def apply_escalation(ctx: FunctionContext, data: ApplyEscalationInput) -> ApplyEscalationResult:
    """Persist the escalation-agent's routing decision. Auto-send promotes the draft to
    the final response and marks it approved+auto_sent; otherwise it queues for human review."""
    pod = Pod.from_env()
    tickets = pod.table("tickets")

    if data.decision == "auto_send":
        ticket = tickets.get(data.ticket_id) or {}
        tickets.update(data.ticket_id, {
            "status": "approved",
            "auto_sent": True,
            "final_response": ticket.get("draft_response"),
        })
        final_status = "approved"
    else:
        tickets.update(data.ticket_id, {"status": "pending_review"})
        final_status = "pending_review"

    return ApplyEscalationResult(ok=True, ticket_id=data.ticket_id, final_status=final_status)
