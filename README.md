# AgentFeed CLI

Local CLI MVP for creating public-safe AgentFeed worklog drafts from AI-assisted development sessions.

```bash
agentfeed init
agentfeed login --token af_live_xxx
agentfeed hook install claude-code
agentfeed collect
agentfeed collect --explain
agentfeed collect --source codex
agentfeed collect --source gemini-cli
agentfeed collect --source claude-code --session-file "$CLAUDE_SESSION_FILE"
agentfeed preview
agentfeed publish --latest --open-review
```

The CLI creates `.agentfeed/drafts/*.json` first and uploads only reviewable private drafts. It does not upload raw diffs, raw transcripts, `.env` contents, or secrets.

`collect` combines Git metrics with local agent session metadata when available. Claude Code JSONL transcripts, Codex JSONL rollouts, Gemini CLI chat logs, and OMC/OMX/Superpowers metadata are parsed locally for safe aggregate data such as edited file paths, line counts, token usage, test commands, failed commands, tool calls, skills used, subagent counts, collection quality, model, and session id; raw transcript content is not stored in the draft. Unknown local agent/plugin metadata is collected as low-confidence aggregate signals when no known agent session is found, and `--explain` shows the non-path source summary used for the draft.
