'use client';

import type React from 'react';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
	LayoutDashboard,
	Package,
	Users,
	FileText,
	ClipboardCheck,
	Calendar,
	BarChart3,
	ChevronLeft,
	ChevronRight,
	X,
	Lock,
	AlertCircle,
	DollarSign,
	Settings,
	LayoutList,
	Trash2,
	Clock,
} from 'lucide-react';
import { clearCache } from '@/utils/cache';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/provider/auth-provider';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/constants/users/user-role';
import { UsersDialog } from '@/components/business/users/users-dialog';
import { toast } from '@/components/ui/use-toast';

const navigation = [
	{ name: 'Panel', href: '/', icon: LayoutDashboard, disabled: false },
	{ name: 'Insumos', href: '/supplies', icon: Package, disabled: false },
	{ name: 'Clientes', href: '/clients', icon: Users, disabled: false },
	{ name: 'Obras', href: '/works', icon: ClipboardCheck, disabled: false },
	{ name: 'Kanban', href: '/kanban', icon: LayoutList, disabled: false },
	{ name: 'Calendario', href: '/calendar', icon: Calendar, disabled: false },
	{ name: 'Ajustes y Diario', href: '/claims', icon: AlertCircle, disabled: false },
	{ name: 'Reportes de Presupuestos', href: '/budgets', icon: FileText, disabled: false },
	{ name: 'Reportes', href: '/reports', icon: BarChart3, disabled: false },
	{ name: 'Flujo de Fondos', href: '/cash-flow', icon: DollarSign, disabled: false },
	{ name: 'Fichar', href: '/clock-in', icon: Clock, disabled: false },
] as const;

export function DashboardLayout({ children }: { children: React.ReactNode }) {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [usersDialogOpen, setUsersDialogOpen] = useState(false);
	const [cacheDialogOpen, setCacheDialogOpen] = useState(false);
	const pathname = usePathname() || '/';
	const router = useRouter();
	const { user, loading, signOutUser } = useAuth();

	const allowedByRole = useMemo(() => {
		return {
			Admin: [
				'Panel',
				'Insumos',
				'Clientes',
				'Kanban',
				'Calendario',
				'Flujo de Fondos',
				'Obras',
				'Reportes',
				'Fichar',
			],
			Taller: ['Insumos', 'Clientes', 'Kanban', 'Calendario', 'Obras', 'Fichar'],
			QR: ['Fichar'],
		} as Record<UserRole, string[]>;
	}, []);

	const homeRouteByRole = useMemo(() => {
		return {
			Admin: '/',
			Taller: '/supplies',
			QR: '/clock-in',
		} as Record<UserRole, string>;
	}, []);

	const filteredNavigation = useMemo(() => {
		if (!user?.role) return navigation;
		const allowedNames = allowedByRole[user.role] ?? [];
		return navigation.filter((item) => allowedNames.includes(item.name));
	}, [user?.role, allowedByRole]);

	const isRouteAllowed = (href: string) => {
		if (!user?.role) return false;
		const allowedNames = allowedByRole[user.role] ?? [];
		const mainItem = navigation.find((item) => item.href === href);
		return Boolean(mainItem && allowedNames.includes(mainItem.name));
	};

	const getHomeRoute = useMemo(() => {
		if (!user?.role) return '/login';
		return homeRouteByRole[user.role] || '/';
	}, [user?.role, homeRouteByRole]);

	useEffect(() => {
		if (loading) return;

		// 1. Redirect to login if not authenticated
		if (!user) {
			if (pathname !== '/login') router.replace('/login');
			return;
		}

		// 2. If user is at root '/', redirect to their specific home route
		if (pathname === '/') {
			if (getHomeRoute !== '/') {
				router.replace(getHomeRoute);
			}
			return;
		}

		// 3. Prevent unauthorized access to restricted routes
		if (!isRouteAllowed(pathname)) {
			router.replace(getHomeRoute);
		}
	}, [loading, user, pathname, router, getHomeRoute, isRouteAllowed]);

	if (loading || !user) {
		return <div className="flex min-h-screen items-center justify-center">Cargando...</div>;
	}

	if (!user.role) {
		return null;
	}

	return (
		<div className="min-h-screen bg-background">
			{sidebarOpen && (
				<div
					className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			<aside
				className={cn(
					'fixed inset-y-0 left-0 z-50 bg-card border-r border-border transition-all duration-200',
					sidebarCollapsed ? 'lg:w-0 lg:overflow-hidden lg:invisible' : 'lg:w-64 lg:visible',
					sidebarOpen ? 'translate-x-0' : '-translate-x-full',
					'lg:translate-x-0'
				)}
			>
				<div className="flex h-full flex-col">
					<div className="flex h-16 items-center justify-between border-b border-border px-6">
						<div className="flex items-center gap-2">
							<Image
								src="/logo-doce8.png"
								alt="Logo"
								width={60}
								height={60}
								style={{ height: 'auto' }}
							/>
							<span className="font-semibold text-foreground">Doce ocho</span>
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="lg:hidden"
							aria-label="Cerrar menú"
							onClick={() => setSidebarOpen(false)}
						>
							<X className="h-5 w-5" />
						</Button>
					</div>

					<nav className="flex-1 space-y-1 px-3 py-4">
						{filteredNavigation.map((item) => {
							const isActive = pathname === item.href;

							return (
								<div key={item.name}>
									<div
										className={cn(
											'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
											isActive
												? 'bg-primary text-primary-foreground'
												: item.disabled
													? 'cursor-not-allowed text-muted-foreground/40'
													: 'text-muted-foreground hover:bg-secondary hover:text-foreground',
											{ 'opacity-60': item.disabled }
										)}
									>
										{item.disabled ? (
											<>
												<item.icon className="h-5 w-5" />
												<span className="flex items-center gap-1">
													{item.name}
													<Lock className="ml-1 h-3.5 w-3.5" />
												</span>
											</>
										) : (
											<Link
												href={item.href}
												className="flex w-full items-center gap-3"
												onClick={() => setSidebarOpen(false)}
											>
												<item.icon className="h-5 w-5" />
												{item.name}
											</Link>
										)}
									</div>
								</div>
							);
						})}
					</nav>

					<div className="px-3">
						{user?.role === 'Admin' && (
							<Button
								variant="ghost"
								size="sm"
								className="w-full justify-start gap-2 mb-2 text-muted-foreground hover:text-foreground"
								onClick={() => setUsersDialogOpen(true)}
							>
								<Settings className="h-4 w-4" />
								Configurar usuarios
							</Button>
						)}
					</div>
					<div className="border-t border-border p-4">
						<div className="flex items-center gap-3">
							<div className="min-w-0 flex-1">
								<p className="truncate text-xs text-muted-foreground">{user?.role ?? ''}</p>
							</div>
							<div className="ml-2">
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button variant="ghost" size="sm">
											Cerrar sesión
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>¿Seguro que querés cerrar sesión?</AlertDialogTitle>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Cancelar</AlertDialogCancel>
											<AlertDialogAction asChild>
												<Button variant="destructive" size="sm" onClick={() => signOutUser()}>
													Sí, cerrar sesión
												</Button>
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</div>
						</div>
					</div>
				</div>
			</aside>

			<UsersDialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen} />

			<div className={cn('transition-all duration-200', sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-64')}>
				{' '}
				<header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => {
							if (window.innerWidth >= 1024) {
								setSidebarCollapsed(!sidebarCollapsed);
							} else {
								setSidebarOpen(!sidebarOpen);
							}
						}}
					>
						{sidebarCollapsed ? (
							<ChevronRight className="h-5 w-5" />
						) : (
							<ChevronLeft className="h-5 w-5" />
						)}
					</Button>
					<div className="flex-1">
						<h1 className="text-lg font-semibold text-foreground">Sistema de Gestión</h1>
					</div>
					<div className="flex items-center gap-2">
						<AlertDialog open={cacheDialogOpen} onOpenChange={setCacheDialogOpen}>
							<AlertDialogTrigger asChild>
								<Button variant="ghost" size="sm" className="opacity-30 hover:opacity-100">
									<Trash2 className="h-4 w-4" />
									Eliminar caché
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Eliminar caché</AlertDialogTitle>
								</AlertDialogHeader>
								<div className="text-sm text-muted-foreground space-y-2">
									<p>
										Al eliminar la caché se borrarán datos temporales almacenados en tu navegador,
										como imágenes, scripts y otros archivos estáticos. Esto puede ayudar a mejorar
										el rendimiento y solucionar problemas de visualización.
									</p>
									<p className="font-medium text-foreground">
										NINGUNO de tus datos guardados (clientes, insumos, obras, etc.) se eliminarán.
									</p>
									<p>Beneficios de eliminar la caché:</p>
									<ul className="list-disc pl-5 space-y-1">
										<li>Liberar espacio de almacenamiento</li>
										<li>Resolver problemas visuales o de carga</li>
									</ul>
									<p>Tené en cuenta que cuando eliminas la caché, se te cerrará la sesión.</p>
								</div>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancelar</AlertDialogCancel>
									<AlertDialogAction onClick={clearCache}>Aceptar</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
						<ThemeToggle />
					</div>
				</header>
				<main className="p-4 lg:p-6">{children}</main>
			</div>
		</div>
	);
}
