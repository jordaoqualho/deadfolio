export default function Loading() {
  return (
    <div
      className="shell page-space"
      role="status"
      aria-label="Loading project records"
    >
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" />
      <div className="project-grid">
        {[1, 2].map((i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
      <span className="sr-only">Opening the archive…</span>
    </div>
  );
}
