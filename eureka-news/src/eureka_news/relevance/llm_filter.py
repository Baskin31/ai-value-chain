import logging

from anthropic import Anthropic

from eureka_news.llm_text import extract_text
from eureka_news.relevance.keyword_filter import CategorizedItem

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-5"


def llm_filter(categorized_items: list[CategorizedItem], client: Anthropic) -> list[CategorizedItem]:
    return [entry for entry in categorized_items if _judge_relevant(client, entry)]


def _judge_relevant(client: Anthropic, entry: CategorizedItem) -> bool:
    prompt = (
        f"Category rule: {entry.category.rule}\n\n"
        f"Story title: {entry.item.title}\n"
        f"Story text: {entry.item.text}\n\n"
        "Does this story satisfy the category rule's inclusion criteria? "
        "Answer with exactly one word: YES or NO."
    )
    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        answer = extract_text(response).strip().upper()
        return answer.startswith("YES")
    except Exception:
        logger.warning("LLM relevance judgment failed for item; keeping item", exc_info=True)
        return True
