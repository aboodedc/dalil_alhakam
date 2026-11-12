import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The dev server rejects client chunks requested from another origin. The
   * project is routinely opened from the host IP (172.28.32.1) — e.g. from
   * WSL, a phone on the LAN, or another machine — so that origin has to be
   * allowed explicitly.
   */
  allowedDevOrigins: ["172.28.32.1", "192.168.56.1"],
};

export default nextConfig;
