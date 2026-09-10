"""
rotating_llm.py — Local LangChain ChatModel for evaluation jobs.

The evaluation stack uses the GPT-OSS model hosted by Ollama on the bosgame
self-hosted runner. The provider list shape is retained so existing Ragas and
Giskard integrations do not need a wider rewrite.

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


# Ollama exposes an OpenAI-compatible endpoint. CI runs on bosgame itself, so
# localhost is both private and independent of external provider quotas.
def build_provider_list() -> list[dict[str, str]]:
    """Build the single local provider from environment variables."""
    return [{
        "name": "ollama",
        "api_key": os.environ.get("LOCAL_LLM_API_KEY", "ollama"),
        "base_url": os.environ.get("LOCAL_LLM_BASE_URL", "http://127.0.0.1:11434/v1").rstrip("/"),
        "model": os.environ.get("LOCAL_LLM_MODEL", "gpt-oss:120b"),
    }]


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
    timeout: int = int(os.environ.get("LOCAL_LLM_TIMEOUT_SEC", "180"))
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


# Map our provider name to LiteLLM's Ollama model id format.
def _litellm_model_id(provider: dict[str, str]) -> Optional[str]:
    name = provider["name"]
    model = provider["model"]
    if name == "ollama":
        return f"ollama/{model}"
    return None


def configure_giskard(providers: list[dict[str, str]], log_fn=print) -> str:
    """Point Giskard's text judge and embeddings at local Ollama models."""
    import giskard
    import numpy as np
    import openai
    import requests
    from giskard.llm.client.openai import OpenAIClient
    from giskard.llm.embeddings import BaseEmbedding, set_default_embedding

    provider = providers[0]
    ollama_root = provider["base_url"].removesuffix("/v1")
    os.environ["OLLAMA_API_BASE"] = ollama_root
    os.environ["OLLAMA_BASE_URL"] = ollama_root
    os.environ["LITELLM_REQUEST_TIMEOUT"] = os.environ.get("LOCAL_LLM_TIMEOUT_SEC", "180")

    litellm_ids = [m for m in (_litellm_model_id(p) for p in providers) if m]
    if not litellm_ids:
        raise RuntimeError("No provider in list maps to a LiteLLM-supported id")

    primary = litellm_ids[0]
    # The native OpenAI-compatible client preserves JSON response mode more
    # reliably than Giskard's LiteLLM adapter for GPT-OSS on Ollama.
    openai_client = openai.OpenAI(
        base_url=provider["base_url"],
        api_key=provider["api_key"],
        timeout=int(os.environ.get("LOCAL_LLM_TIMEOUT_SEC", "180")),
        max_retries=1,
    )
    giskard.llm.set_default_client(
        OpenAIClient(model=provider["model"], client=openai_client, json_mode=True)
    )
    log_fn(f"  Judge: {provider['model']} via {provider['base_url']}")

    embedding_model = os.environ.get("LOCAL_EMBEDDING_MODEL", "qwen3-embedding:4b")

    class OllamaOpenAIEmbedding(BaseEmbedding):
        def embed(self, texts):
            response = requests.post(
                f"{provider['base_url']}/embeddings",
                headers={"Authorization": f"Bearer {provider['api_key']}"},
                json={"model": embedding_model, "input": list(texts)},
                timeout=int(os.environ.get("LOCAL_LLM_TIMEOUT_SEC", "180")),
            )
            response.raise_for_status()
            rows = sorted(response.json()["data"], key=lambda row: row["index"])
            return np.asarray([row["embedding"] for row in rows], dtype=np.float32)

    # Giskard 2.16 resets a custom default when no model name is registered.
    # Register a marker first, then install the direct adapter it will reuse.
    giskard.llm.set_embedding_model(f"local/{embedding_model}")
    set_default_embedding(OllamaOpenAIEmbedding())
    log_fn(f"  Embeddings: {embedding_model} via {provider['base_url']}/embeddings")

    return f"local/{provider['model']}"
