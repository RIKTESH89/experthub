# Local Groq synthetic smoke

This runner does not import application sources, visitor data or production configuration. It uses two built-in synthetic experts, independently of embeddings.

The repository-root `.env.local-test-groq` is ignored. A blank-key file was created at the user's request with owner-only permissions. Enter your own Groq key locally in `LOCAL_TEST_GROQ_API_KEY`; never paste it into chat. Keep these names and settings:

- `LOCAL_TEST_GROQ_API_KEY`: your user-entered key.
- `LOCAL_TEST_GROQ_BASE_URL`: `https://api.groq.com/openai/v1`.
- `LOCAL_TEST_GROQ_MODEL`: `openai/gpt-oss-120b`.

If creating a new local setup, copy `groq.env.example` into that root file without overwriting an existing secret. Confirm free-tier account limits and no billing changes in Console. The allowlist cannot determine whether your account will be billed.

After explicit authorization for the synthetic network smoke, from the repository root:

```sh
node scripts/local-test/groq-synthetic.cjs --allow-synthetic-network
```

Without that flag the runner exits without loading the secret or sending a request. With it, the run is capped at two requests, 256 output tokens per request and a 15-second request timeout. It has no retries, provider fallback, paid-model fallback, streaming, tool calls or production configuration changes. Provider failure output omits credentials and response bodies. Structured answers must reference the supplied synthetic evidence IDs or express uncertainty. This smoke validates provider wiring/schema, not person fidelity or conversational naturalness.

Mock coverage is in `__tests__/phase0/groq-local.test.ts`; no provider call has been made by these tests.
