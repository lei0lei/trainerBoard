const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function getAppBasePath() {
  if (!rawBasePath) return "";
  return `/${rawBasePath.replace(/^\/+|\/+$/g, "")}`;
}

export function prefixAppPath(path: string) {
  const basePath = getAppBasePath();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalizedPath}` || "/";
}
