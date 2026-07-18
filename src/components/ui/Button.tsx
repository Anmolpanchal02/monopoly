"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg shadow-rose-500/20 hover:brightness-110",
    secondary:
      "bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur",
    danger: "bg-red-600 text-white hover:bg-red-500",
    ghost: "bg-transparent text-white/80 hover:bg-white/10",
    success: "bg-emerald-600 text-white hover:bg-emerald-500",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2 text-sm rounded-xl",
    lg: "px-6 py-3 text-base rounded-2xl",
  };

  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className={cn(
        "font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {children}
    </motion.button>
  );
}
