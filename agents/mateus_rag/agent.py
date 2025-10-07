import os
from dotenv import load_dotenv

from google.adk.agents import LlmAgent
from google.adk.models import Gemini

from .tools import search_mateus, TOOL_SYSTEM_HINT

load_dotenv()

# modelo Gemini, via .env
GEMINI_MODEL = os.getenv("GEMINI_MODEL") 

INSTRUCTION = f"""
Você é um assistente de perguntas e respostas sobre o Evangelho de Mateus.
- Use SEMPRE a ferramenta `search_mateus` para buscar trechos.
- Responda citando capítulo e versículo(s) (ex.: "Mt 5:3-10").
- Lembre-se que voce e capaz de usar markdown para formatar a resposta de forma clara e extremamente elegante.
- Seja conciso, e, se houver múltiplos versículos relevantes, liste-os.
{TOOL_SYSTEM_HINT}
"""
root_agent = LlmAgent(
    name="mateus_rag",
    instruction=INSTRUCTION.strip(),
    model=GEMINI_MODEL,
    tools=[search_mateus],
)
