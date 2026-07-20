import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  turbopack: {
    root: appRoot,
  },
};

export default nextConfig;
