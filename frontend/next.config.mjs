import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

const backendDevOrigin = process.env.BACKEND_DEV_ORIGIN ?? "http://127.0.0.1:8000";

export default function nextConfig(phase) {
  const isDevelopmentServer = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    ...(isDevelopmentServer
      ? {
          async rewrites() {
            return [
              {
                source: "/api/:path*",
                destination: `${backendDevOrigin}/api/:path*`,
              },
            ];
          },
        }
      : {
          output: "export",
        }),
    trailingSlash: true,
  };
}
