from datetime import date
from unittest.mock import Mock

from eureka_news.models import NormalizedItem
from eureka_news.relevance.config import Category
from eureka_news.relevance.keyword_filter import CategorizedItem
from eureka_news.relevance.llm_filter import llm_filter

CATEGORY = Category(id="government", display_name="Government", keywords=["tax"], rule="Include tax votes.")


def _entry(title):
    item = NormalizedItem(source="s", url="u", title=title, text="", published_date=date(2026, 8, 1))
    return CategorizedItem(item=item, category=CATEGORY)


def _fake_client(answers):
    client = Mock()
    responses = iter(answers)

    def create(**kwargs):
        response = Mock()
        response.content = [Mock(text=next(responses))]
        return response

    client.messages.create.side_effect = create
    return client


def test_llm_filter_keeps_only_yes_answers():
    entries = [_entry("Council votes to raise property tax"), _entry("Council members pose for a photo")]
    client = _fake_client(["YES", "NO"])
    result = llm_filter(entries, client=client)
    assert len(result) == 1
    assert result[0].item.title == "Council votes to raise property tax"


def test_llm_filter_sends_category_rule_in_prompt():
    entries = [_entry("Council votes to raise property tax")]
    client = _fake_client(["YES"])
    llm_filter(entries, client=client)
    prompt = client.messages.create.call_args.kwargs["messages"][0]["content"]
    assert "Include tax votes." in prompt
    assert client.messages.create.call_args.kwargs["model"] == "claude-sonnet-5"


def test_llm_filter_keeps_item_on_api_failure():
    entries = [_entry("Council votes to raise property tax")]
    client = Mock()
    client.messages.create.side_effect = RuntimeError("API error")
    result = llm_filter(entries, client=client)
    assert len(result) == 1
    assert result[0].item.title == "Council votes to raise property tax"
