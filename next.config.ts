import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root. There's another lockfile higher up the tree, and
  // without this Turbopack guesses the parent directory and traces the wrong
  // files. (Next 16 moved this out of `experimental`.)
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
