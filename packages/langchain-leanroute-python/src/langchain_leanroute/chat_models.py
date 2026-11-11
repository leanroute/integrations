"""ChatLeanroute: a LangChain chat model that routes through Leanroute.

Leanroute speaks the OpenAI Chat Completions API, so this is ``ChatOpenAI``
with Leanroute's base URL, the Leanroute key, and the agent-run headers
filled in. Everything ChatOpenAI supports (tools, structured output,
streaming, async, LangGraph) works unchanged.
"""

from __future__ import annotations

import os
from typing import Any, Dict, Optional

from langchain_openai import ChatOpenAI
from pydantic import model_validator

from .agent import CLIENT_ID, agent_headers

DEFAULT_BASE_URL = "https://api.leanroute.dev/v1"


class ChatLeanroute(ChatOpenAI):
    """Chat model routed through Leanroute.

    Setup:
        ``pip install langchain-leanroute`` and set ``LEANROUTE_API_KEY`` to a
        runtime key (``gw_live_*``) from https://leanroute.dev/dashboard/keys.

    Example:
        .. code-block:: python

            from langchain_leanroute import ChatLeanroute, new_run_id

            llm = ChatLeanroute(
                model="deepseek/deepseek-v4-1-flash",
                agent_name="research-agent",
                session_id=new_run_id(),   # one per run
            )
            llm.invoke("Explain retrieval-augmented generation in one sentence.")

    Agent runs:
        ``agent_name`` and ``session_id`` are sent as ``X-Agent-Name`` and
        ``X-Agent-Session-Id``. Headers are fixed per instance, so create one
        instance per run. See https://leanroute.dev/docs/agents.
    """

    agent_name: Optional[str] = None
    """Sent as X-Agent-Name. Defaults (server side) to the API key's name."""

    session_id: Optional[str] = None
    """Sent as X-Agent-Session-Id. Use one value per run."""

    agent_id: Optional[str] = None
    """Sent as X-Agent-Id: an optional subagent id within the run."""

    explicit_routing: bool = False
    """Send ``x-gateway-routing: explicit``: no cheaper-model swaps, no failover."""

    @model_validator(mode="before")
    @classmethod
    def _leanroute_defaults(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values
        values = dict(values)

        key = (
            values.get("api_key")
            or values.get("openai_api_key")
            or os.environ.get("LEANROUTE_API_KEY")
        )
        if not key:
            raise ValueError(
                "ChatLeanroute: missing API key. Pass api_key= or set LEANROUTE_API_KEY. "
                "Create one at https://leanroute.dev/dashboard/keys"
            )
        values.pop("openai_api_key", None)
        values["api_key"] = key

        if not (values.get("base_url") or values.get("openai_api_base")):
            values["base_url"] = os.environ.get("LEANROUTE_BASE_URL", DEFAULT_BASE_URL)

        headers: Dict[str, str] = {"X-Leanroute-Client": CLIENT_ID}
        headers.update(values.get("default_headers") or {})
        headers.update(
            agent_headers(
                name=values.get("agent_name"),
                session_id=values.get("session_id"),
                agent_id=values.get("agent_id"),
            )
        )
        if values.get("explicit_routing"):
            headers["x-gateway-routing"] = "explicit"
        values["default_headers"] = headers
        return values

    @property
    def _llm_type(self) -> str:
        return "leanroute-chat"

    @property
    def lc_secrets(self) -> Dict[str, str]:
        return {"openai_api_key": "LEANROUTE_API_KEY"}
