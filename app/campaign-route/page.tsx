"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CampaignRouteRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/?tab=route");
  }, [router]);
  return null;
}
