"use client";

import { useEffect, useState } from "react";

type Status = "checking" | "ok" | "down";

// Temporary check that the web app can reach the API through the /graphql proxy.
export function ApiStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    fetch("/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "{ health }" }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json) => setStatus(json?.data?.health ? "ok" : "down"))
      .catch(() => setStatus("down"));
  }, []);

  const label = { checking: "Checking API…", ok: "API is reachable", down: "API is not reachable" }[status];

  return <p className="mt-6 text-sm">{label}</p>;
}
