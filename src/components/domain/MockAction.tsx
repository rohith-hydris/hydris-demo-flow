"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { StatusPill } from "@/src/components/ui";

/** A demo action for the supplier role and the agents: a button that confirms in place. Nothing is sent anywhere. */
export default function MockAction({ label, done, icon: Icon, onDone }: { label: string; done: string; icon: LucideIcon; onDone?: (done: string) => void }) {
  const [on, setOn] = useState(false);
  return on ? (
    <span role="status"><StatusPill tone="positive" shape="circle" label={done} /></span>
  ) : (
    <button type="button" onClick={() => { setOn(true); onDone?.(done); }} className="btn btn-secondary min-h-11 px-4 text-sm"><Icon className="size-4" aria-hidden="true" /> {label}</button>
  );
}
