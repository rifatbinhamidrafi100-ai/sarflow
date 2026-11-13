import type { PointerEvent } from 'react';

/** Reveals aligned layers; changing this control never changes map geography. */
export default function ComparisonHandle({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const bounded = (n: number) => onChange(Math.max(0, Math.min(100, n)));
  function move(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    if (bounds?.width) bounded((100 * (event.clientX - bounds.left)) / bounds.width);
  }
  return (
    <div
      className="observation-swipe"
      style={{ left: `${value}%` }}
      role="slider"
      tabIndex={0}
      aria-label="Move imagery comparison"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-valuetext={`${Math.round(value)} percent across the image`}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) move(event);
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onKeyDown={(event) => {
        const delta = event.shiftKey ? 10 : 2;
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? 100
              : ['ArrowRight', 'ArrowUp'].includes(event.key)
                ? value + delta
                : ['ArrowLeft', 'ArrowDown'].includes(event.key)
                  ? value - delta
                  : null;
        if (next !== null) {
          event.preventDefault();
          bounded(next);
        }
      }}
    >
      <span aria-hidden="true">↔</span>
    </div>
  );
}
