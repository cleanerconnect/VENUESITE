// LYFE wordmark — black square with white "L" + "LYFE" wordmark + small
// "Organizer" eyebrow underneath. Sized via the `size` prop.
export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative h-10 w-10 rounded-[12px] bg-ink flex items-center justify-center text-canvas overflow-hidden"
        aria-hidden
      >
        <span
          className="text-[20px] leading-none font-extrabold"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          L
        </span>
        <span
          className="absolute right-1.5 bottom-1.5 h-1.5 w-1.5 rounded-full bg-gold"
          aria-hidden
        />
      </div>
      {!collapsed ? (
        <div className="leading-tight">
          <div
            className="text-[15px] font-extrabold tracking-[-0.02em] text-ink"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            LYFE
          </div>
          <div className="text-eyebrow text-ink-mute mt-0.5">Organizer</div>
        </div>
      ) : null}
    </div>
  );
}
