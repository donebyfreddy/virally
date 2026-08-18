/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Render backends are Node-only and heavy; never bundle them into the app graph.
  // They are dynamically imported on the server solely when MP4 export is configured.
  serverExternalPackages: ["@remotion/lambda", "@remotion/bundler", "@remotion/renderer"],
}

export default nextConfig
