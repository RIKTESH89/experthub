import { isStagingPreview } from "../../preview-environment.cjs";

// Server datasource construction only. Never export these values through Next config.
const DIRECT_HOST = "ep-quiet-bread-b3rqji3g.c-4.ap-southeast-1.aws.neon.tech";
const POOLED_HOST = "ep-quiet-bread-b3rqji3g-pooler.c-4.ap-southeast-1.aws.neon.tech";
const REFUSAL = "STAGING_DATABASE_BINDING_REFUSED";

function refuse(): never {
  throw new Error(REFUSAL);
}

function validate(raw: string | undefined, direct: boolean): string {
  if (typeof raw !== "string" || !raw || raw !== raw.trim() || raw.length > 8192) refuse();
  let url: URL;
  try { url = new URL(raw); } catch { refuse(); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || raw.includes("#")) refuse();
  if (url.port && url.port !== "5432") refuse();
  if (url.hostname !== DIRECT_HOST && (direct || url.hostname !== POOLED_HOST)) refuse();
  if (url.pathname !== "/neondb") refuse();
  let role: string;
  try { role = decodeURIComponent(url.username); } catch { refuse(); }
  if (role !== "neondb_owner" || !url.password) refuse();
  const allowed = ["sslmode", "channel_binding", "schema", "pgbouncer", "connect_timeout", "pool_timeout", "connection_limit"];
  const seen = new Set<string>();
  url.searchParams.forEach((value, key) => {
    if (!allowed.includes(key) || seen.has(key)) refuse();
    seen.add(key);
    if (key === "schema" && value !== "public") refuse();
    if (key === "channel_binding" && value !== "require") refuse();
    if (key === "pgbouncer" && (direct || value !== "true")) refuse();
    if (["connect_timeout", "pool_timeout", "connection_limit"].includes(key) && (!/^[1-9][0-9]*$/.test(value) || Number(value) > 60)) refuse();
  });
  if (!["require", "verify-ca", "verify-full"].includes(url.searchParams.get("sslmode") || "")) refuse();
  return raw;
}

/** Capture once and bind the exact reviewed staging runtime URL before constructing a client. */
export function stagingAuthRuntimeUrl(env: Record<string, string | undefined> = process.env): string | undefined {
  let metadata: Record<string, string | undefined>;
  try {
    metadata = {
      VERCEL_ENV: env.VERCEL_ENV,
      VERCEL_GIT_COMMIT_REF: env.VERCEL_GIT_COMMIT_REF,
      VERCEL_BRANCH_URL: env.VERCEL_BRANCH_URL,
    };
  } catch { refuse(); }
  if (!isStagingPreview(metadata)) return undefined;
  let runtimeUrl: string | undefined;
  let directUrl: string | undefined;
  try {
    runtimeUrl = env.DATABASE_URL;
    directUrl = env.DIRECT_URL;
  } catch { refuse(); }
  validate(directUrl, true);
  return validate(runtimeUrl, false);
}
