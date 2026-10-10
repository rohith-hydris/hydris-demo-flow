"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/src/context/RoleContext";
import { AppMain, PageSkeleton } from "@/src/components/ui";

// Inner pages need a role. With none stored (a direct link, a new tab) send the visitor to the entry screen.
export default function AppGate({ children }: { children: ReactNode }) {
  const { role, ready } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (ready && !role) router.replace("/");
  }, [ready, role, router]);

  const loading = (
    <div className="pt-32"><AppMain><PageSkeleton /></AppMain></div>
  );
  if (!role) return loading;
  return <Suspense fallback={loading}>{children}</Suspense>;
}
