"""Agent runs (Leanroute agent-native phase 1).

Two optional headers turn agent traffic into runs on the Leanroute Agent
runs page and ``GET /platform/v1/runs``:

* ``X-Agent-Name``: which agent (defaults to the API key's name)
* ``X-Agent-Session-Id``: which run. Send the same value on every request
  in one run, and a new one for the next run.

Every request from this package also carries ``X-Leanroute-Client`` so
usage can be traced to the integration that sent it.
Docs: https://leanroute.dev/docs/agents
"""

from __future__ import annotations

import uuid
from typing import Dict, Optional

from ._version import __version__

#: Sent as ``X-Leanroute-Client``.
CLIENT_ID = f"langchain-leanroute/{__version__}"

_MAX_LEN = 128


def _clean(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = str(value).strip()[:_MAX_LEN]
    return value or None


def agent_headers(
    name: Optional[str] = None,
    session_id: Optional[str] = None,
    agent_id: Optional[str] = None,
) -> Dict[str, str]:
    """Agent identity as request headers. Unset values produce no header."""
    out: Dict[str, str] = {}
    if _clean(name):
        out["X-Agent-Name"] = _clean(name)  # type: ignore[assignment]
    if _clean(session_id):
        out["X-Agent-Session-Id"] = _clean(session_id)  # type: ignore[assignment]
    if _clean(agent_id):
        out["X-Agent-Id"] = _clean(agent_id)  # type: ignore[assignment]
    return out


def new_run_id() -> str:
    """A fresh run id (UUID4). Call once per run, not once per request."""
    return str(uuid.uuid4())
