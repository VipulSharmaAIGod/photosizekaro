export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startKeepalive } = await import("./lib/keepalive");
  startKeepalive("photosizekaro");
}
