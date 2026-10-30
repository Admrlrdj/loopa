"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

/** Rute lama: ringkasan sesi kini bernama "Session Wrap" di /wrap. */
function Redirect() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  useEffect(() => { router.replace(id ? `/wrap?id=${id}` : "/"); }, [id, router]);
  return null;
}

export default function SummaryRedirect() {
  return <Suspense fallback={null}><Redirect /></Suspense>;
}
