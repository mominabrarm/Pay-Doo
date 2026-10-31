import type { Money } from "../api/types";

export function formatCurrency(value: Money): string {
  const amount = Number(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

export function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function billingPeriodEnd(periodStart: string, interval: "daily" | "weekly" | "monthly" | "yearly"): string {
  const start = new Date(`${periodStart}T00:00:00`);
  if (interval === "daily") return periodStart;
  if (interval === "weekly") start.setDate(start.getDate() + 6);
  if (interval === "monthly") start.setMonth(start.getMonth() + 1, 0);
  if (interval === "yearly") {
    start.setFullYear(start.getFullYear() + 1);
    start.setDate(start.getDate() - 1);
  }
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}
