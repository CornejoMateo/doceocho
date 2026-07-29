/** @type {import('next').NextConfig} */
const nextConfig = {
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		unoptimized: true,
	},
	serverExternalPackages: ['jspdf', 'fflate'],
	allowedDevOrigins: ['192.168.68.57'],
	turbopack: {}, // Configuración vacía para evitar problemas
	webpack: (config, { isServer }) => {
		// Ignorar módulos problemáticos en el cliente
		if (!isServer) {
			config.resolve.alias = {
				...config.resolve.alias,
				jspdf: false,
				fflate: false,
			};

			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
			};
		}

		return config;
	},
};

export default nextConfig;
