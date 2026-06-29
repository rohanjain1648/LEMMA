#input_type_name: IntakeEmailInput
#output_type_name: IntakeEmailResult
#function_name: intake_email

import re
from typing import Optional
from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class IntakeEmailInput(BaseModel):
    sender: str = ""          # e.g. "Jane Doe <jane@example.com>" or "jane@example.com"
    subject: str = ""
    message_text: str = ""


class IntakeEmailResult(BaseModel):
    ok: bool
    ticket_id: Optional[str] = None
    skipped: bool = False


_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")


def _parse(sender: str):
    """Return (email, display_name) from a raw From header value."""
    email_match = _EMAIL_RE.search(sender or "")
    email = email_match.group(0) if email_match else ""
    name = ""
    m = re.match(r"\s*\"?([^\"<]+?)\"?\s*<", sender or "")
    if m:
        name = m.group(1).strip()
    return email, name


async def intake_email(ctx: FunctionContext, data: IntakeEmailInput) -> IntakeEmailResult:
    """Silently turn an inbound support email into a ticket (source=email). No reply is
    sent to the customer — the autonomous ticket-pipeline drafts the response, which a
    human reviews/sends from the dashboard. This is the correct pattern for anonymous
    inbound mail (a surface would auto-reply to every sender)."""
    pod = Pod.from_env()

    email, name = _parse(data.sender)
    if not email:
        # Can't attribute the ticket to a customer; skip rather than create junk.
        return IntakeEmailResult(ok=True, skipped=True)

    subject = (data.subject or "").strip() or "(no subject)"
    body = (data.message_text or "").strip() or "(no body)"

    created = pod.table("tickets").create({
        "subject": subject[:500],
        "body": body,
        "customer_email": email[:320],
        "customer_name": name or None,
        "source": "email",
        "status": "new",
    })
    return IntakeEmailResult(ok=True, ticket_id=(created or {}).get("id"))
