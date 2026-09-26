// Runs once, before the first request.
//
// The only thing in it is the demo clock: `LYFE_DEMO_CLOCK` has to be
// applied before any module reads the hour, and `register()` is the one
// hook Next.js gives that is guaranteed to run first.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { installPortalDemoClock } = await import("@/lib/time/demo-clock");
  const offset = installPortalDemoClock();
  if (offset) {
    console.log(
      `LYFE_DEMO_CLOCK actif — horloge décalée de ${Math.round(offset / 60_000)} min, il est ${new Date().toISOString()}`,
    );
  }
}
