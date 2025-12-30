const repoName = "SatarkMitra-Disaster-Management-System";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",

  basePath: `/${repoName}`,
  assetPrefix: `/${repoName}/`,

  trailingSlash: true,   // 🔴 THIS IS THE MISSING PIECE

  images: {
    unoptimized: true,
  },
};

export default nextConfig;
