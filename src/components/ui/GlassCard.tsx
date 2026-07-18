"use client";

import { cn } from "@/lib/utils";

export function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-xl shadow-black/20",
        className
      )}
    >
      {children}
    </div>
  );
}
