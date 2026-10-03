/** Server-only, explicit local evaluation opt-in. Never selected in production/hosted runtimes.
 * This is a development rollout gate, not proof of deployment location or semantic safety. */
export function localDialogueEvaluationEnabled(): boolean {
  return process.env.EXP15_EXP17_LOCAL_EVALUATION === "1" &&
    (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") &&
    !process.env.VERCEL && !process.env.VERCEL_ENV && !process.env.AWS_EXECUTION_ENV &&
    !process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.K_SERVICE && !process.env.WEBSITE_INSTANCE_ID &&
    process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED !== "true";
}
