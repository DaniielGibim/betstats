"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "danger" | "blue";
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  className,
}: MetricCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
          valueColor: "text-emerald-600 dark:text-emerald-400",
        };
      case "danger":
        return {
          iconBg: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400",
          valueColor: "text-red-600 dark:text-red-400",
        };
      case "blue":
        return {
          iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
          valueColor: "text-blue-600 dark:text-blue-400",
        };
      default:
        return {
          iconBg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
          valueColor: "text-slate-900 dark:text-white",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Card
      className={cn(
        "flex flex-col justify-between p-5 sm:p-6 transition-all hover:shadow-md border-slate-200/80 dark:border-slate-800",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          {title}
        </span>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shadow-xs", styles.iconBg)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3">
        <div className={cn("text-2xl sm:text-3xl font-extrabold tracking-tight", styles.valueColor)}>
          {value}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </Card>
  );
}
