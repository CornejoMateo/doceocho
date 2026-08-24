import type React from 'react';
import type { Metadata } from 'next';
import '@fontsource/open-sauce-one/300.css';
import '@fontsource/open-sauce-one/400.css';
import '@fontsource/open-sauce-one/500.css';
import '@fontsource/open-sauce-one/600.css';
import '@fontsource/open-sauce-one/700.css';
import { Analytics } from '@vercel/analytics/next';
import '../styles/globals.css';
import { Suspense } from 'react';
import { AuthProvider } from '@/components/provider/auth-provider';
import { ThemeProvider } from '@/components/provider/theme-provider';
import { ChatUnreadProvider } from '@/components/provider/chat-unread-provider';
import { Toaster } from '@/components/ui/toaster';
import { ServiceWorkerRegister } from '@/components/service-worker-register';

export const metadata: Metadata = {
	title: 'Doce ocho - Sistema de Gestión',
	description: 'Ecosistema administrativo para Doce ocho',
	generator: 'v0.app',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="es" suppressHydrationWarning className="h-full">
			<head>
				<link rel="manifest" href="/manifest.json" />
				<link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-doce8.png" />
				<link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-doce8.png" />
				<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-doce8.png" />
				<meta name="theme-color" content="#4F5C4D" />
				<meta name="mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
				<meta name="apple-mobile-web-app-title" content="Doceocho" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes"
				/>
			</head>
			<body className={`font-sans antialiased bg-background text-foreground min-h-screen`}>
				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					enableSystem
					disableTransitionOnChange
					enableColorScheme
				>
					<AuthProvider>
						<ChatUnreadProvider>
							<Suspense fallback={null}>{children}</Suspense>
						</ChatUnreadProvider>
					</AuthProvider>
					<Toaster />
					<Analytics />
					<ServiceWorkerRegister />
				</ThemeProvider>
			</body>
		</html>
	);
}
