#input_type_name: ApplyTriageInput
#output_type_name: ApplyTriageResult
#function_name: apply_triage

from typing import Optional
from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class ApplyTriageInput(BaseModel):
    ticket_id: str
    category: str
    priority: str
    sentiment: str
    customer_name: Optional[str] = None


class ApplyTriageResult(BaseModel):
    ok: bool
    ticket_id: str
    customer_id: Optional[str] = None


def _esc(v: str) -> str:
    return v.replace("'", "''")


async def apply_triage(ctx: FunctionContext, data: ApplyTriageInput) -> ApplyTriageResult:
    """Deterministically persist the triage-agent's classification onto the ticket
    and upsert the customer. Functions are reliable writers — no LLM tool-call flakiness."""
    pod = Pod.from_env()
    tickets = pod.table("tickets")

    # 1. Persist classification onto the ticket.
    tickets.update(data.ticket_id, {
        "category": data.category,
        "priority": data.priority,
        "sentiment": data.sentiment,
        "status": "triaged",
    })

    # 2. Best-effort customer upsert keyed by the ticket's customer_email.
    customer_id: Optional[str] = None
    try:
        ticket = pod.table("tickets").get(data.ticket_id)
        email = (ticket or {}).get("customer_email")
        if email:
            resp = pod.query(f"SELECT id, ticket_count FROM customers WHERE email = '{_esc(email)}'")
            rows = [dict(getattr(it, "additional_properties", {}) or {}) for it in resp.items]
            if rows:
                customer_id = rows[0].get("id")
                current = rows[0].get("ticket_count") or 0
                pod.table("customers").update(customer_id, {"ticket_count": int(current) + 1})
            else:
                created = pod.table("customers").create({
                    "email": email,
                    "name": data.customer_name or (ticket or {}).get("customer_name"),
                    "ticket_count": 1,
                    "is_active": True,
                })
                customer_id = (created or {}).get("id")
    except Exception:
        # Customer enrichment is secondary; never fail the run over it.
        pass

    return ApplyTriageResult(ok=True, ticket_id=data.ticket_id, customer_id=customer_id)
