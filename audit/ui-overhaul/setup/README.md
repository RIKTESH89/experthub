# 21st MCP — owner setup only

This is an inactive, blank-key template. No active configuration was read or changed; no service was connected, package installed, key transmitted, or credential created.

Owner-edit file: `/Users/rikteshs20/.codex/config.toml`. Desktop, CLI and IDE share this configuration. A trusted project's `.codex/config.toml` is also supported, but do not put a credential in Git.

After replacing any exposed key privately, add the table from `21st-mcp.config.toml.example` to the owner config. Prefer deleting `http_headers` and using `env_http_headers = { "x-api-key" = "API_KEY_21ST" }`, supplying that variable privately to the Codex process environment. For owner use only: when the replacement is ready, change `enabled` to `true` and restart the MCP connection from Settings → MCP servers → Restart. `/mcp` shows connected servers. Do not enable the blank header template.

The current executor has no `codex` binary on PATH. Use the desktop settings/config route; no CLI install is needed for this template.

Sources: [OpenAI MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli), [21st official README](https://github.com/21st-dev/magic-mcp). Configuration uses Codex TOML, rather than copying another client's JSON.
