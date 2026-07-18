"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const PIP_MAP: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [
    [26, 26],
    [74, 74],
  ],
  3: [
    [26, 26],
    [50, 50],
    [74, 74],
  ],
  4: [
    [26, 26],
    [74, 26],
    [26, 74],
    [74, 74],
  ],
  5: [
    [26, 26],
    [74, 26],
    [50, 50],
    [26, 74],
    [74, 74],
  ],
  6: [
    [26, 26],
    [74, 26],
    [26, 50],
    [74, 50],
    [26, 74],
    [74, 74],
  ],
};

function RealDie({
  value,
  rolling,
  size = 52,
  delay = 0,
}: {
  value: number;
  rolling: boolean;
  size?: number;
  delay?: number;
}) {
  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size, perspective: 400 }}
      animate={
        rolling
          ? {
              rotateX: [0, 280, 520, 720],
              rotateY: [0, -200, -420, -540],
              rotateZ: [12, -18, 10, 8],
              y: [0, -18, -6, 0],
            }
          : { rotateX: 12, rotateY: -18, rotateZ: 0, y: 0 }
      }
      transition={
        rolling
          ? { duration: 0.95, ease: [0.22, 0.8, 0.25, 1], delay }
          : { type: "spring", stiffness: 260, damping: 18, delay }
      }
    >
      {/* 3D die body */}
      <div
        className="relative h-full w-full rounded-[22%]"
        style={{
          background:
            "linear-gradient(145deg, #ffffff 0%, #f8fafc 40%, #e2e8f0 78%, #cbd5e1 100%)",
          boxShadow: `
            inset 2px 2px 4px rgba(255,255,255,0.95),
            inset -3px -4px 8px rgba(15,23,42,0.18),
            4px 8px 14px rgba(15,23,42,0.28),
            0 1px 0 rgba(255,255,255,0.8)
          `,
          border: "1px solid rgba(15,23,42,0.12)",
          transform: "translateZ(0)",
        }}
      >
        {/* top highlight edge for plastic look */}
        <div
          className="pointer-events-none absolute inset-x-[8%] top-[6%] h-[28%] rounded-full opacity-70"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0))",
          }}
        />
        {PIP_MAP[value].map(([x, y], i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              width: size * 0.17,
              height: size * 0.17,
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
              background:
                "radial-gradient(circle at 35% 30%, #3f3f46 0%, #18181b 55%, #09090b 100%)",
              boxShadow:
                "inset 0 1px 1px rgba(255,255,255,0.25), 0 1px 2px rgba(0,0,0,0.35)",
            }}
          />
        ))}
      </div>

      {/* ground shadow */}
      <div
        className="pointer-events-none absolute left-1/2 rounded-full bg-black/30 blur-[4px]"
        style={{
          width: size * 0.78,
          height: size * 0.16,
          bottom: -size * 0.14,
          transform: "translateX(-50%)",
        }}
      />
    </motion.div>
  );
}

export function Dice({
  die1,
  die2,
  rolling,
  size = 52,
  className,
}: {
  die1: number;
  die2: number;
  rolling: boolean;
  size?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState({ die1, die2 });

  useEffect(() => {
    if (!rolling) {
      setDisplay({ die1, die2 });
      return;
    }
    const interval = setInterval(() => {
      setDisplay({
        die1: Math.floor(Math.random() * 6) + 1,
        die2: Math.floor(Math.random() * 6) + 1,
      });
    }, 70);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setDisplay({ die1, die2 });
    }, 920);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [rolling, die1, die2]);

  return (
    <div className={cn("flex items-end gap-2.5", className)}>
      <RealDie value={display.die1} rolling={rolling} size={size} />
      <RealDie value={display.die2} rolling={rolling} size={size} delay={0.06} />
    </div>
  );
}

export function DiceIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/dice-pair.png"
      alt=""
      className={cn("h-7 w-7 object-contain drop-shadow-md", className)}
      draggable={false}
    />
  );
}
