# AgentFeed CLI

Local CLI MVP for creating public-safe AgentFeed worklog drafts from AI-assisted development sessions.

```bash
agentfeed init
agentfeed login --token af_live_xxx
agentfeed hook install claude-code
agentfeed collect
agentfeed preview
agentfeed publish --latest --open-review
```

The CLI creates `.agentfeed/drafts/*.json` first and uploads only reviewable private drafts. It does not upload raw diffs, raw transcripts, `.env` contents, or secrets.
