"""Live smoke test against the Leanroute API. Needs LEANROUTE_API_KEY.

    python scripts/smoke.py

Then check /dashboard/agents for a run by "pkg-test-python".
"""

from langchain_leanroute import CLIENT_ID, ChatLeanroute, new_run_id

run_id = new_run_id()
llm = ChatLeanroute(
    model="deepseek/deepseek-v4-1-flash",
    agent_name="pkg-test-python",
    session_id=run_id,
)
print("answer:", llm.invoke("Say ok").content)
print("run id:", run_id)
print("client:", CLIENT_ID)
