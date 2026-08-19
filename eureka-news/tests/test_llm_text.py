from unittest.mock import Mock

import pytest

from eureka_news.llm_text import extract_text


def test_extract_text_returns_first_text_block():
    response = Mock()
    response.content = [Mock(type="text", text="hello")]
    assert extract_text(response) == "hello"


def test_extract_text_skips_leading_thinking_block():
    response = Mock()
    response.content = [Mock(type="thinking", text=None), Mock(type="text", text="hello")]
    assert extract_text(response) == "hello"


def test_extract_text_raises_when_no_text_block_present():
    response = Mock()
    response.content = [Mock(type="thinking", text=None)]
    with pytest.raises(ValueError):
        extract_text(response)
