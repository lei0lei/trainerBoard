import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const normalizedBasePath = rawBasePath
  ? `/${rawBasePath.replace(/^\/+|\/+$/g, "")}`
  : "";
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
    basePath: normalizedBasePath || undefined,
    assetPrefix: normalizedBasePath || undefined,
    trailingSlash: true,
  };
}
