import Link from "next/link";
export default function NotFound() {
  return (
    <div className="shell page-space empty-state">
      <span className="eyebrow">404 / MISSING RECORD</span>
      <h1>No remains found.</h1>
      <p>This project isn’t in the public archive.</p>
      <Link className="button primary" href="/graveyard">
        Back to the Graveyard
      </Link>
    </div>
  );
}
