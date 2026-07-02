#input_type_name: SendReplyInput
#output_type_name: SendReplyResult
#function_name: send_reply

from typing import Optional
from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod

# The connected support mailbox (supportpilotdemo@gmail.com). Pinning the account
# means the reply always goes out FROM the support inbox, whoever approves it.
SUPPORT_GMAIL_ACCOUNT_ID = "019f1c17-f349-7082-b117-dcfcd103cadb"
GMAIL_AUTH_CONFIG = "supportpilot-gmail"


class SendReplyInput(BaseModel):
    ticket_id: str
    body_override: Optional[str] = None   # operator's edited draft, if any


class SendReplyResult(BaseModel):
    ok: bool
    sent: bool = False
    reason: str = ""


async def send_reply(ctx: FunctionContext, data: SendReplyInput) -> SendReplyResult:
    """Send the approved reply to the customer via Gmail. Called ONLY from the
    dashboard 'Approve & Send' action — never automatically. Idempotent: refuses to
    re-send a ticket already marked 'sent'."""
    pod = Pod.from_env()
    tickets = pod.table("tickets")
    ticket = tickets.get(data.ticket_id) or {}

    if ticket.get("status") == "sent":
        return SendReplyResult(ok=True, sent=False, reason="already sent")

    to_email = (ticket.get("customer_email") or "").strip()
    body = (data.body_override or ticket.get("final_response") or ticket.get("draft_response") or "").strip()
    if not to_email or not body:
        return SendReplyResult(ok=False, sent=False, reason="missing recipient or body")

    subject = (ticket.get("subject") or "Your support request").strip()
    if not subject.lower().startswith("re:"):
        subject = f"Re: {subject}"

    # Send via the Gmail connector, pinned to the support inbox account.
    pod.connectors.execute(
        GMAIL_AUTH_CONFIG,
        "GMAIL_SEND_EMAIL",
        {"recipient_email": to_email, "subject": subject, "body": body},
        account_id=SUPPORT_GMAIL_ACCOUNT_ID,
    )

    tickets.update(data.ticket_id, {
        "status": "sent",
        "final_response": body,
    })
    return SendReplyResult(ok=True, sent=True, reason=f"sent to {to_email}")
