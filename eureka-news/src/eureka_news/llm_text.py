def extract_text(response) -> str:
    for block in response.content:
        if getattr(block, "type", None) == "text":
            return block.text
    raise ValueError("No text block found in Claude response content")
