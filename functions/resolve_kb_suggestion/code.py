#input_type_name: ResolveKbSuggestionInput
#output_type_name: ResolveKbSuggestionResult
#function_name: resolve_kb_suggestion

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class ResolveKbSuggestionInput(BaseModel):
    suggestion_id: str
    action: str  # "approve" | "dismiss"


class ResolveKbSuggestionResult(BaseModel):
    ok: bool
    suggestion_id: str
    status: str
    kb_article_id: str = ""


async def resolve_kb_suggestion(ctx: FunctionContext, data: ResolveKbSuggestionInput) -> ResolveKbSuggestionResult:
    """Operator decision on a suggested KB article. Approve publishes it as a real,
    active knowledge_base row the draft-agent can search immediately. Dismiss just
    closes the suggestion. Called ONLY from the dashboard Knowledge Gaps queue."""
    pod = Pod.from_env()
    suggestions = pod.table("kb_suggestions")
    suggestion = suggestions.get(data.suggestion_id) or {}

    if suggestion.get("status") not in ("pending",):
        return ResolveKbSuggestionResult(ok=True, suggestion_id=data.suggestion_id, status=suggestion.get("status", "unknown"))

    if data.action == "approve":
        created = pod.table("knowledge_base").create({
            "title": suggestion.get("title"),
            "content": suggestion.get("content"),
            "category": suggestion.get("category") or "general",
            "is_active": True,
        })
        suggestions.update(data.suggestion_id, {"status": "approved"})
        return ResolveKbSuggestionResult(ok=True, suggestion_id=data.suggestion_id, status="approved",
                                          kb_article_id=(created or {}).get("id", ""))

    suggestions.update(data.suggestion_id, {"status": "dismissed"})
    return ResolveKbSuggestionResult(ok=True, suggestion_id=data.suggestion_id, status="dismissed")
