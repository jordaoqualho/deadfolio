export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logIntegrationStatus } = await import("@/lib/ai/config");
  logIntegrationStatus();
}
