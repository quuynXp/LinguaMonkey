import language_tool_python
import logging

def check_spelling(text, language):
    try:
        tool = language_tool_python.LanguageTool(language)
        matches = tool.check(text)
        corrections = [f"{match.context}: {match.message}" for match in matches]
        return corrections, ""
    except Exception as e:
        logging.error(f"Spelling check error: {str(e)}")
        return [], str(e)