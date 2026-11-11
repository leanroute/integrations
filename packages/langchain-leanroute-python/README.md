# langchain-leanroute

LangChain integration for [Leanroute](https://leanroute.dev), the agent-native AI gateway.

`ChatLeanroute` is LangChain's `ChatOpenAI` pointed at Leanroute: one key for 100+ models across 14 providers (OpenAI, Anthropic, Google, xAI, DeepSeek, Qwen and more), with failover, caching, spend caps, MCP tools on any model, and cost per agent run. Tools, structured output, streaming, async and LangGraph work unchanged.

## Install

```bash
pip install langchain-leanroute
```

Create a runtime key (`gw_live_*`) at [leanroute.dev/dashboard/keys](https://leanroute.dev/dashboard/keys) and set it:

```bash
export LEANROUTE_API_KEY=gw_live_...
```

New accounts get 100 free requests on low-cost models, no card needed.

## Use

```python
from langchain_leanroute import ChatLeanroute

llm = ChatLeanroute(model="deepseek/deepseek-v4-1-flash")
print(llm.invoke("Explain retrieval-augmented generation in one sentence.").content)
```

Model ids use the `provider/model` form, e.g. `anthropic/claude-sonnet-5` or `openai/gpt-5.6-terra`. Full list: [leanroute.dev/docs/models](https://leanroute.dev/docs/models).

## Agent runs

Name your agent and give each run an id, and Leanroute groups the calls into runs on the [Agent runs](https://leanroute.dev/docs/agents) page: cost per run, models used, and every tool called.

```python
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langchain_leanroute import ChatLeanroute, new_run_id


@tool
def get_weather(city: str) -> str:
    """Return the current temperature for a city."""
    return f"{city}: 22°C"


def run(task: str) -> str:
    llm = ChatLeanroute(
        model="anthropic/claude-sonnet-5",
        agent_name="weather-agent",
        session_id=new_run_id(),  # one per run
    )
    agent = create_react_agent(llm, tools=[get_weather])
    result = agent.invoke({"messages": [("user", task)]})
    return result["messages"][-1].content


print(run("What's the weather in Singapore?"))
```

`agent_name` is sent as `X-Agent-Name` (without it, the API key's name is used) and `session_id` as `X-Agent-Session-Id`. Headers are fixed per instance, so create one `ChatLeanroute` per run. Every request also carries `X-Leanroute-Client: langchain-leanroute/<version>`.

## Options

| Argument           | Default                              | What it does                                                     |
| ------------------ | ------------------------------------ | ---------------------------------------------------------------- |
| `model`            | required                             | `provider/model` id                                              |
| `api_key`          | `LEANROUTE_API_KEY`                  | Leanroute runtime key                                            |
| `base_url`         | `LEANROUTE_BASE_URL`, else Leanroute | Override for staging or self-hosted                              |
| `agent_name`       | none                                 | `X-Agent-Name`                                                   |
| `session_id`       | none                                 | `X-Agent-Session-Id`; use `new_run_id()`                         |
| `agent_id`         | none                                 | `X-Agent-Id`, a subagent within the run                          |
| `explicit_routing` | `False`                              | Sends `x-gateway-routing: explicit`: no model swaps, no failover |

Every other `ChatOpenAI` argument (`temperature`, `max_tokens`, `timeout`, `max_retries`, ...) passes through.

## Links

- [LangChain + Leanroute guide](https://leanroute.dev/docs/integrations/langchain)
- [Agent runs](https://leanroute.dev/docs/agents)
- [Gateway headers](https://leanroute.dev/docs/headers)

## License

Apache-2.0. See [LICENSE](./LICENSE).
