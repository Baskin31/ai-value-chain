from anthropic import Anthropic

from eureka_news.relevance.keyword_filter import CategorizedItem

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
    response = client.messages.create(
        model=MODEL,
        max_tokens=8,
        messages=[{"role": "user", "content": prompt}],
    )
    answer = response.content[0].text.strip().upper()
    return answer.startswith("YES")
