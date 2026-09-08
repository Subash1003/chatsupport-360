// Shimmer placeholders while data loads. Used by the account / project pages.

export function SkeletonLines({ count = 3, widths = ['100%', '80%', '60%'] }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton skel-line"
          style={{ width: widths[i % widths.length] }}
        />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 3 }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skel-card" />
      ))}
    </div>
  );
}

export default SkeletonLines;
