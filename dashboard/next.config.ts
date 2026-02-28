import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    // Ensure Next.js treats the dashboard directory as the workspace root
    root: path.join(__dirname),
  },
};

export default nextConfig;
