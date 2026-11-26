import type { NextConfig } from "next";

// The Nest API. The browser only talks to this app, which forwards API calls,
// so the refresh-token cookie stays same-origin and no CORS setup is needed.
const apiUrl = process.env.API_URL ?? "http://127.0.0.1:3000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiUrl}/api/:path*` },
      { source: "/graphql", destination: `${apiUrl}/graphql` },
    ];
  },
};

export default nextConfig;
