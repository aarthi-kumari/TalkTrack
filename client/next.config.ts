import type { NextConfig } from "next";

const apiOrigin = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:5000";

const nextConfig: NextConfig = {
	experimental: {
		optimizePackageImports: ["lucide-react"],
	},
	turbopack: {
		root: process.cwd(),
	},
	async rewrites() {
		return [
			{
				source: "/api/:path*",
				destination: `${apiOrigin}/api/:path*`,
			},
			{
				source: "/socket.io/:path*",
				destination: `${apiOrigin}/socket.io/:path*`,
			},
		];
	},
};

export default nextConfig;
