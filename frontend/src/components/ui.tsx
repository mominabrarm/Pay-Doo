import type { ReactNode } from "react";
import { titleCase } from "../utils/format";

export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">PayDoo operations</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function LoadingState({ label = "Loading data" }: { label?: string }) {
  return <div className="state loading"><span className="spinner" />{label}…</div>;
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="state empty"><strong>{title}</strong><span>{message}</span></div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="state error"><strong>Couldn’t load data</strong><span>{message}</span>{retry && <button className="button secondary" onClick={retry}>Try again</button>}</div>;
}

export function Flash({ kind, children }: { kind: "success" | "error"; children: ReactNode }) {
  return <div className={`flash ${kind}`} role={kind === "error" ? "alert" : "status"}>{children}</div>;
}

export function StatusBadge({ value }: { value: string }) {
  return <span className={`badge badge-${value}`}>{titleCase(value)}</span>;
}

export function MetricCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</article>;
}

export function FormLabel({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

export function PaginationControls({ page, hasNext, onPageChange }: { page: number; hasNext: boolean; onPageChange: (page: number) => void }) {
  if (page === 0 && !hasNext) return null;
  return <div className="pagination-controls" aria-label="Collection pages">
    <button className="button secondary" type="button" disabled={page === 0} onClick={() => onPageChange(page - 1)}>Previous</button>
    <span>Page {page + 1}</span>
    <button className="button secondary" type="button" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>Next</button>
  </div>;
}
