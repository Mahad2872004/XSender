import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The static /automation mockup was replaced by the real flow builder in
      // Phase 2. Redirect rather than 404 so old links and bookmarks still land
      // somewhere sensible.
      { source: '/automation', destination: '/flows', permanent: false },
      { source: '/automation/:path*', destination: '/flows', permanent: false },
    ];
  },
};

export default nextConfig;
