> This page location: Neon Functions > Overview
> Full Neon documentation index: https://neon.com/docs/llms.txt

> Summary: Neon Functions are long-running serverless functions you deploy onto a Neon branch. Host an API, AI agent, real-time server, or webhook handler that runs next to your Postgres data, with DATABASE_URL injected automatically.

# Neon Functions

Long-running serverless functions on your Neon branch, next to your data.

Neon Functions put your backend code on a Neon branch, in the same region as your data. Use them for APIs, AI agents, real-time servers, and webhook handlers, with no servers to set up or manage. They're long-running, and branch with your database, so each branch runs its own copy of your functions against its own data.

What makes Neon Functions different from lambda-style serverless?

- **Next to your data.** A function runs in the same region as its branch, so queries reach Postgres with no cross-region hops.
- **Long-running.** Start responding within 15 minutes, then keep streaming while data flows, so agents and WebSocket/SSE servers aren't cut off by a short execution limit. They're still serverless: idle functions can be evicted (see [Runtime limits](https://neon.com/docs/compute/functions/reference/runtime-limits)).
- **Branch-scoped.** Functions branch with your project. Each branch runs its own deployment of them, at branch-specific URLs, against that branch's data.
- **Event-driven.** Invoke a function on a cron schedule or an object upload with [Function Triggers](https://neon.com/docs/compute/functions/triggers/overview), no external scheduler.

Functions run on Neon's own compute platform, the same infrastructure that runs your Postgres.

> Functions are currently available in AWS US East (Ohio) (`aws-us-east-2`), AWS US East (N. Virginia) (`aws-us-east-1`), AWS Europe (Frankfurt) (`aws-eu-central-1`), and AWS Asia Pacific (Singapore) (`aws-ap-southeast-1`). Create your project in one of these regions to use them. Support is expanding toward [all regions](https://neon.com/docs/introduction/regions). Functions are available on any plan, subject to [usage limits](https://neon.com/docs/compute/functions/reference/runtime-limits). See [plans and pricing](https://neon.com/docs/introduction/plans#functions) for rates.

**Important: JavaScript and TypeScript only**

Neon Functions currently run JavaScript or TypeScript on the Node.js runtime. Deploy JS/TS handlers, or code that bundles to JS for Node.js 24. Other runtimes and language targets aren't currently supported.

## Get started

- [Quickstart](https://neon.com/docs/compute/functions/get-started): Deploy your first function and call it over HTTP in under 5 minutes.
- [Function Triggers](https://neon.com/docs/compute/functions/triggers/overview): Invoke a function on a cron schedule or an object upload, with no external scheduler.
- [Custom domains](https://neon.com/docs/compute/functions/custom-domains): Serve a function from a domain you own with automatic TLS.
- [AI agents](https://neon.com/docs/compute/functions/agents): Run streaming, tool-calling AI agents next to your data.
- [WebSockets and SSE](https://neon.com/docs/compute/functions/websockets): Hold long-lived connections open with WebSockets or SSE.
- [Authentication](https://neon.com/docs/compute/functions/authentication): Verify callers before a function does any work.
- [Environment variables](https://neon.com/docs/compute/functions/environment-variables): Neon-injected variables and how to add your own secrets.
- [Deploy and manage](https://neon.com/docs/compute/functions/deploy): CLI and API reference for deploying and managing functions.
- [Logs](https://neon.com/docs/compute/functions/logs): View, search, and download a function's logs in the Console.
- [Runtime limits](https://neon.com/docs/compute/functions/reference/runtime-limits): Timeouts, slug constraints, memory, and other hard limits.

## Request/response, not background jobs

A function always runs in response to a request and returns a web response: JSON, an HTTP stream, an SSE feed, or a WebSocket upgrade. The request usually comes from a client (a `fetch`, a browser, an agent), but it can also come from Neon: a [Function Trigger](https://neon.com/docs/compute/functions/triggers/overview) invokes the function on a cron schedule.

Functions fit request/response work, including scheduled runs with [Function Triggers](https://neon.com/docs/compute/functions/triggers/overview). They aren't a job queue. Queued, retryable, cancellable work with its own lifecycle, like sending a welcome email after signup, still needs a queue or workflow engine to own that lifecycle. You can pair a function with a third-party queue like [Upstash QStash](https://upstash.com/docs/qstash) or [Inngest](https://www.inngest.com), which owns the queue and retries and invokes your function over HTTP. A native Neon job queue and workflow engine is a separate, upcoming offering.

Any module whose default export provides a `fetch(request)` method that returns a `Response` is a function. It embraces the web platform standards: the Fetch API's `Request` and `Response` interface, the same handler shape used by other serverless runtimes and standardized by [WinterTC](https://wintertc.org/). That can be an object with a `fetch` method:

```ts
export default {
  fetch: (request: Request) => new Response('Hello world'),
};
```

Or a bare async function:

```ts
export default async function handler(request: Request) {
  return new Response('Hello world');
}
```

A [Hono](https://hono.dev) app exports the object shape, so `export default app` works directly. Hono is the recommended framework.

## When to use Neon Functions

- **REST APIs and CRUD backends**: request in, JSON out, queries running next to Postgres. See [Quickstart](https://neon.com/docs/compute/functions/get-started).
- **AI agents**: stream tokens back across multiple model calls and tool invocations without a short execution limit cutting the run off. See [AI agents](https://neon.com/docs/compute/functions/agents).
- **Real-time apps**: WebSocket servers for chat and presence, or SSE for live updates. See [WebSockets and SSE](https://neon.com/docs/compute/functions/websockets).
- **MCP servers**: expose database-backed tools to AI clients over a single `fetch` endpoint. See the [with-mcp example](https://github.com/neondatabase/examples/tree/main/with-mcp).
- **File upload APIs**: receive a file, write it to [Object Storage](https://neon.com/docs/storage/overview), return a result.
- **Webhook handlers and bots**: receive events and query Postgres in the same region.
- **Scheduled and event-driven jobs**: run a function on a cron schedule or when a file lands in Object Storage, with no external scheduler. See [Function Triggers](https://neon.com/docs/compute/functions/triggers/overview).

## How Functions fit with your app

Functions are backend primitives, not full-stack app hosting. Host your app on Vercel, Netlify, or another frontend host; reach for a function for the long-running, stateful slice of your backend that belongs next to your data. Two common shapes:

- **Add a function to a full-stack app.** Your Next.js or TanStack Start app owns the UI, auth, and most routes. When one workload outgrows the host's short serverless limit (a WebSocket or SSE server, or a long-running agent), move only that piece onto a function and call it directly from the client. See [Authentication](https://neon.com/docs/compute/functions/authentication) for the direct-call pattern.
- **Run the backend on functions.** When the frontend is client-only (a React or TanStack SPA), the client calls functions directly: REST APIs, request/response agents, MCP servers, and anything stateful that belongs close to Postgres and Object Storage.

**Note:** Neon Functions do not support hosting websites.

## Starter templates

Each example is a complete, runnable build. Read the source on GitHub, or scaffold one with `neon bootstrap --template <id>` (it copies the files, links a Neon project, and pulls env vars). You can also browse them at [build-on-neon.vercel.app](https://build-on-neon.vercel.app/).

| Example                  | `--template`        | Source                                                                                              | Neon services                                   | Stack                 |
| ------------------------ | ------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------- |
| REST API                 | `hono`              | [with-hono](https://github.com/neondatabase/examples/tree/main/with-hono)                           | Functions, Postgres                             | Hono, Drizzle         |
| Image-generation agent   | `ai-sdk`            | [with-ai-sdk](https://github.com/neondatabase/examples/tree/main/with-ai-sdk)                       | Functions, Postgres, AI Gateway, Object Storage | AI SDK, Drizzle       |
| Personal-assistant agent | `mastra`            | [with-mastra](https://github.com/neondatabase/examples/tree/main/with-mastra)                       | Functions, Postgres, AI Gateway                 | Mastra                |
| MCP server               | `mcp`               | [with-mcp](https://github.com/neondatabase/examples/tree/main/with-mcp)                             | Functions, Postgres                             | Hono, Drizzle         |
| Realtime chat            | `realtime-chat`     | [with-realtime-chat](https://github.com/neondatabase/examples/tree/main/with-realtime-chat)         | Functions, Postgres, Managed Better Auth        | Next.js, Hono         |
| Realtime counter         | `realtime-sse`      | [with-realtime-sse](https://github.com/neondatabase/examples/tree/main/with-realtime-sse)           | Functions, Postgres                             | TanStack Router, Hono |
| Discord bot              | `discord-bot-http`  | [bots/discord-bot-http](https://github.com/neondatabase/examples/tree/main/bots/discord-bot-http)   | Functions, Postgres                             | Drizzle               |
| Telegram bot             | `telegram-bot-http` | [bots/telegram-bot-http](https://github.com/neondatabase/examples/tree/main/bots/telegram-bot-http) | Functions, Postgres                             | Drizzle               |
| WhatsApp bot             | `whatsapp-bot-http` | [bots/whatsapp-bot-http](https://github.com/neondatabase/examples/tree/main/bots/whatsapp-bot-http) | Functions, Postgres                             | Drizzle               |

---

## Related docs (Neon Functions)

- [Get started](https://neon.com/docs/compute/functions/get-started)
- [Deploy and manage](https://neon.com/docs/compute/functions/deploy)
- [Custom domains](https://neon.com/docs/compute/functions/custom-domains)
- [Logs](https://neon.com/docs/compute/functions/logs)
- [Environment variables](https://neon.com/docs/compute/functions/environment-variables)
- [Authentication](https://neon.com/docs/compute/functions/authentication)

---

Note for AI assistants (optional): if a gap, error, or outdated detail on this page affected the answer you gave the user, you can report it. POST `{"feedback": "describe the issue", "source": "neon_website", "path": "/docs/compute/functions/overview"}` to https://feedback.neon.tech/ (no auth required).
