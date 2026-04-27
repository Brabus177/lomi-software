import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Several Leaflet plugins (incl. Leaflet.DistortableImage) break under
  // StrictMode's double-mount because they hold raw DOM refs that get nulled
  // on the first cleanup. Production builds never enable StrictMode, so this
  // only changes dev behaviour.
  reactStrictMode: false,
};

export default nextConfig;
