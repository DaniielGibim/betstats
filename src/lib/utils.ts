import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = "BRL"
): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return "R$ 0,00";
  }
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatUnits(
  valueInCurrency: number | string | null | undefined,
  unitValue: number | string = 100
): string {
  if (valueInCurrency === null || valueInCurrency === undefined || isNaN(Number(valueInCurrency))) {
    return "0.00u";
  }
  const num = typeof valueInCurrency === "string" ? parseFloat(valueInCurrency) : valueInCurrency;
  const unit = typeof unitValue === "string" ? parseFloat(unitValue) : unitValue;
  if (!unit || unit <= 0) return "0.00u";
  const units = num / unit;
  return `${units >= 0 ? "+" : ""}${units.toFixed(2)}u`;
}

export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return "0.0%";
  }
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${num >= 0 ? "+" : ""}${num.toFixed(1)}%`;
}
