"""Unit tests. No network: they only check how ChatLeanroute is configured."""

import pytest

from langchain_leanroute import (
    CLIENT_ID,
    DEFAULT_BASE_URL,
    ChatLeanroute,
    __version__,
    agent_headers,
    new_run_id,
)


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv("LEANROUTE_API_KEY", "gw_live_test")
    monkeypatch.delenv("LEANROUTE_BASE_URL", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)


def test_defaults():
    llm = ChatLeanroute(model="deepseek/deepseek-v4-1-flash")
    assert llm.openai_api_base == DEFAULT_BASE_URL
    assert llm.openai_api_key.get_secret_value() == "gw_live_test"
    assert llm.model_name == "deepseek/deepseek-v4-1-flash"
    assert llm.default_headers["X-Leanroute-Client"] == CLIENT_ID
    assert "X-Agent-Session-Id" not in llm.default_headers
    assert llm._llm_type == "leanroute-chat"


def test_agent_headers_set():
    run = new_run_id()
    llm = ChatLeanroute(
        model="anthropic/claude-sonnet-5",
        agent_name="research-agent",
        session_id=run,
        agent_id="planner",
    )
    h = llm.default_headers
    assert h["X-Agent-Name"] == "research-agent"
    assert h["X-Agent-Session-Id"] == run
    assert h["X-Agent-Id"] == "planner"


def test_explicit_routing_and_caller_headers():
    llm = ChatLeanroute(
        model="openai/gpt-5.6-luna",
        explicit_routing=True,
        default_headers={"X-Custom": "1"},
    )
    assert llm.default_headers["x-gateway-routing"] == "explicit"
    assert llm.default_headers["X-Custom"] == "1"


def test_explicit_key_and_base_url_win(monkeypatch):
    llm = ChatLeanroute(
        model="m", api_key="gw_live_other", base_url="https://staging.example/v1"
    )
    assert llm.openai_api_key.get_secret_value() == "gw_live_other"
    assert llm.openai_api_base == "https://staging.example/v1"


def test_base_url_env(monkeypatch):
    monkeypatch.setenv("LEANROUTE_BASE_URL", "https://self-hosted.example/v1")
    assert ChatLeanroute(model="m").openai_api_base == "https://self-hosted.example/v1"


def test_missing_key(monkeypatch):
    monkeypatch.delenv("LEANROUTE_API_KEY")
    with pytest.raises(Exception, match="LEANROUTE_API_KEY"):
        ChatLeanroute(model="m")


def test_agent_headers_helper():
    assert agent_headers() == {}
    assert agent_headers(name="  a  ") == {"X-Agent-Name": "a"}
    assert len(agent_headers(session_id="x" * 500)["X-Agent-Session-Id"]) == 128


def test_new_run_id_unique():
    assert new_run_id() != new_run_id()


def test_client_id_matches_version():
    assert CLIENT_ID == f"langchain-leanroute/{__version__}"
