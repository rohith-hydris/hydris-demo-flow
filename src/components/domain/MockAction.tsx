"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { StatusPill } from "@/src/components/ui";

/** A demo action for the supplier role: a button that confirms in place. Nothing is sent anywhere. */
export default function MockAction({ label, done, icon: Icon }: { label: string; done: string; icon: LucideIcon }) {
  const [on, setOn] = useState(false);
  return on ? (
    <span role="status"><StatusPill tone="positive" shape="circle" label={done} /></span>
  ) : (
    <button type="button" onClick={() => setOn(true)} className="btn btn-secondary min-h-11 px-4 text-sm"><Icon className="size-4" aria-hidden="true" /> {label}</button>
  );
}
