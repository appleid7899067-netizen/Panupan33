# OpenAI Agents API runnable test

This project includes a direct HTTP integration using curl.

It:
1. Creates a reusable agent named "New agent" in OpenAI project "proj_TRlczjll9oTTJWHCQ7a8SkPl".
2. Uses the returned agent ID to start a session.
3. Uses an OpenAI-hosted execution environment with Node.js and Python setup checks.
4. Sends an initial user message.
5. Streams session events and output.
6. Surfaces tool-call events and fails closed on API/session errors or incomplete turns.

## Setup

Set OPENAI_API_KEY in the shell, Render environment, or another server-side secret store. Do not put the key in browser code or commit it.

    export OPENAI_API_KEY="sk-..."
    npm run agents:api

The script requires curl and Node.js.

## Success gate

The script exits successfully only after it sees agent.session.turn.completed and no error event. A partial stream, failed environment, or failed tool call is treated as failure.

## API references

- Agents API overview: https://developers.openai.com/api/docs/guides/agents-api/overview
- Create reusable agent: POST /v1/agents
- Create session: POST /v1/agents/sessions
- Stream session events: GET /v1/agents/sessions/{session_id}/events
