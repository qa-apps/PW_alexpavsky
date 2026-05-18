"""
rotating_llm.py — Custom LangChain ChatModel that auto-rotates across providers.

When one provider hits a rate limit, quota, or transient error, the next
provider in the ordered list is tried automatically. Designed for Ragas
evaluation where we want resilience across:
  Groq, OpenRouter, Cerebras, Mistral, Sambanova, Hugging Face, Gemini.

All providers below expose an OpenAI-compatible chat-completions API, so a
single LangChain ChatOpenAI client works for each one — only base_url, model,
and api_key change per provider.
"""
from __future__ import annotations

import logging
import os
import time
from typing import Any, Optional

from langchain_core.callbacks.manager import CallbackManagerForLLMRun
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage
from langchain_core.outputs import ChatResult
from langchain_openai import ChatOpenAI
from pydantic import ConfigDict, Field

log = logging.getLogger("rotating-llm")


# OpenAI-compatible endpoints for each provider. Models picked for high quality
# + generous free tiers. Order = priority (first provider tried first).
def build_provider_list() -> list[dict[str, str]]:
    """Build the ordered provider list from environment variables."""
    candidates = [
        {
            "name": "groq",
            "api_key": os.environ.get("GROQ_API_KEY", ""),
            "base_url": "https://api.groq.com/openai/v1",
            "model": "llama-3.3-70b-versatile",
        },
        {
            "name": "cerebras",
            "api_key": os.environ.get("CEREBRAS_API_KEY", ""),
            "base_url": "https://api.cerebras.ai/v1",
            "model": "llama-3.3-70b",
        },
        {
            "name": "sambanova",
            "api_key": os.environ.get("SAMBANOVA_API_KEY", ""),
            "base_url": "https://api.sambanova.ai/v1",
            "model": "Meta-Llama-3.3-70B-Instruct",
        },
        {
            "name": "mistral",
            "api_key": os.environ.get("MISTRAL_API_KEY", ""),
            "base_url": "https://api.mistral.ai/v1",
            "model": "mistral-small-latest",
        },
        {
            "name": "openrouter-llama",
            "api_key": os.environ.get("OPENROUTER_API_KEY", ""),
            "base_url": "https://openrouter.ai/api/v1",
            "model": "meta-llama/llama-3.3-70b-instruct:free",
        },
        {
            "name": "openrouter-deepseek",
            "api_key": os.environ.get("OPENROUTER_API_KEY", ""),
            "base_url": "https://openrouter.ai/api/v1",
            "model": "deepseek/deepseek-r1-0528:free",
        },
        {
            "name": "openrouter-qwen",
            "api_key": os.environ.get("OPENROUTER_API_KEY", ""),
            "base_url": "https://openrouter.ai/api/v1",
            "model": "qwen/qwen3-coder:free",
        },
        {
            "name": "huggingface",
            "api_key": os.environ.get("HF_TOKEN", ""),
            "base_url": "https://router.huggingface.co/v1",
            "model": "meta-llama/Llama-3.3-70B-Instruct:cerebras",
        },
    ]
    return [p for p in candidates if p["api_key"]]


# Errors that should trigger rotation (rate limit, quota, auth, etc.)
ROTATE_ON_PATTERNS = (
    "rate", "429", "quota", "limit", "credit", "exhaust",
    "402", "401", "insufficient", "out of tokens", "tpd", "rpd", "tpm",
)


class RotatingJudgeLLM(BaseChatModel):
    """LangChain ChatModel that rotates through providers on failure.

    Used as a drop-in replacement for ChatOpenAI in Ragas. Each `_generate`
    call tries providers in `providers` order, switching on rate-limit /
    quota errors, until one succeeds.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    providers: list[dict[str, str]] = Field(default_factory=list)
    temperature: float = 0.0
    timeout: int = 30
    max_retries: int = 1
    _last_used_idx: int = 0

    @property
    def _llm_type(self) -> str:
        return "rotating-judge"

    @property
    def _identifying_params(self) -> dict[str, Any]:
        return {
            "providers": [f"{p['name']}/{p['model']}" for p in self.providers],
            "temperature": self.temperature,
        }

    def _make_client(self, provider: dict[str, str]) -> ChatOpenAI:
        """Construct a fresh ChatOpenAI client for a provider."""
        return ChatOpenAI(
            model=provider["model"],
            base_url=provider["base_url"],
            api_key=provider["api_key"],
            temperature=self.temperature,
            timeout=self.timeout,
            max_retries=self.max_retries,
        )

    def _should_rotate(self, err: Exception) -> bool:
        msg = str(err).lower()
        return any(pat in msg for pat in ROTATE_ON_PATTERNS)

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: Optional[list[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        if not self.providers:
            raise RuntimeError("RotatingJudgeLLM has no providers configured")

        errors: list[str] = []
        n = len(self.providers)
        # Start from the last successful provider to minimize switching cost.
        for offset in range(n):
            idx = (self._last_used_idx + offset) % n
            provider = self.providers[idx]
            try:
                client = self._make_client(provider)
                result = client._generate(messages, stop=stop, run_manager=run_manager, **kwargs)
                self._last_used_idx = idx
                return result
            except Exception as e:
                err_msg = f"{provider['name']}/{provider['model']}: {type(e).__name__}: {str(e)[:140]}"
                errors.append(err_msg)
                if self._should_rotate(e):
                    log.warning("Rotating away from %s — %s", provider["name"], type(e).__name__)
                    # Skip ahead but keep current as last_used for next call's start.
                    continue
                # Non-rotate-able error: still try next, but log differently.
                log.warning("Hard error from %s: %s", provider["name"], type(e).__name__)
                continue

        raise RuntimeError(
            f"All {n} judge providers failed:\n  " + "\n  ".join(errors)
        )

    async def _agenerate(
        self,
        messages: list[BaseMessage],
        stop: Optional[list[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        # Sync fallback — Ragas's metrics call async paths, this keeps things simple.
        import asyncio
        return await asyncio.to_thread(self._generate, messages, stop, None, **kwargs)
