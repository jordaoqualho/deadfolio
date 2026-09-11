"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="shell page-space empty-state">
      <h1>The archive couldn’t be opened.</h1>
      <p>Something went wrong loading this page. Please try again.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
