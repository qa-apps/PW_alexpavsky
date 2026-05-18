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


# Map our provider names → LiteLLM native model id format.
# LiteLLM auto-reads <PROVIDER>_API_KEY from env, so we don't need OPENAI_API_BASE.
def _litellm_model_id(provider: dict[str, str]) -> Optional[str]:
    name = provider["name"]
    model = provider["model"]
    if name == "groq":
        return f"groq/{model}"
    if name == "cerebras":
        return f"cerebras/{model}"
    if name == "sambanova":
        return f"sambanova/{model}"
    if name == "mistral":
        return f"mistral/{model}"
    if name.startswith("openrouter"):
        return f"openrouter/{model}"
    if name == "huggingface":
        # LiteLLM uses 'huggingface/<repo>' for the HF inference endpoint.
        return f"huggingface/{model}"
    return None


def configure_giskard(providers: list[dict[str, str]], log_fn=print) -> str:
    """Point Giskard's LLM + embedding judge at our providers.

    Uses LiteLLM-native provider prefixes (groq/, cerebras/, mistral/, ...)
    rather than the OpenAI-compat shim — the shim breaks because Groq et al.
    don't expose every OpenAI endpoint (notably embeddings).

    Picks the first provider with a key as primary, configures Giskard to
    auto-fall-back through the remaining providers when LiteLLM raises a
    rate-limit / quota error.

    Embeddings always go through HuggingFace router (free, has the embedding
    endpoint we need) — `huggingface/sentence-transformers/all-MiniLM-L6-v2`.
    Requires HF_TOKEN; if missing, skip embedding config and let Giskard
    fall back to its default (will error if it tries to embed).

    Returns the primary model id string for logging / report metadata.
    """
    import giskard

    # LiteLLM auto-reads provider keys from env. Our providers list already
    # filters to ones with non-empty api_key, so set the env explicitly here
    # so LiteLLM finds them even if the runner didn't export some of them.
    env_map = {
        "groq": "GROQ_API_KEY",
        "cerebras": "CEREBRAS_API_KEY",
        "sambanova": "SAMBANOVA_API_KEY",
        "mistral": "MISTRAL_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
        "huggingface": "HF_TOKEN",
    }
    for p in providers:
        base = p["name"].split("-", 1)[0]  # "openrouter-llama" -> "openrouter"
        envvar = env_map.get(base)
        if envvar and p["api_key"]:
            os.environ[envvar] = p["api_key"]

    # Build (primary, fallbacks) using LiteLLM id format.
    litellm_ids = [m for m in (_litellm_model_id(p) for p in providers) if m]
    if not litellm_ids:
        raise RuntimeError("No provider in list maps to a LiteLLM-supported id")

    primary, fallbacks = litellm_ids[0], litellm_ids[1:]
    log_fn(f"  Judge (LiteLLM): {primary}")
    if fallbacks:
        log_fn(f"  Fallbacks: {len(fallbacks)} ({', '.join(fallbacks[:3])}...)")

    # set_llm_model signature varies across Giskard versions; pass fallbacks
    # via kwargs and accept that some versions may ignore them (the primary
    # still works on its own — Ragas + Giskard share the same env keys).
    try:
        giskard.llm.set_llm_model(primary, fallbacks=fallbacks)
    except TypeError:
        # Older Giskard without fallbacks kwarg.
        giskard.llm.set_llm_model(primary)
    except Exception as e:
        log_fn(f"  WARN: set_llm_model failed: {e}")

    # Embedding: HuggingFace router serves it for free with HF_TOKEN.
    if os.environ.get("HF_TOKEN"):
        try:
            giskard.llm.set_embedding_model(
                "huggingface/sentence-transformers/all-MiniLM-L6-v2"
            )
            log_fn("  Embeddings: huggingface/sentence-transformers/all-MiniLM-L6-v2")
        except Exception as e:
            log_fn(f"  WARN: set_embedding_model failed: {e}")
    else:
        log_fn("  WARN: HF_TOKEN missing — embeddings unconfigured")

    return primary
