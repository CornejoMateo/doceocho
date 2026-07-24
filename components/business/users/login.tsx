'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/provider/auth-provider';
import type { UserRole } from '@/constants/users/user-role';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
	const { signIn, user, loading } = useAuth();
	const router = useRouter();
	const [usuario, setUsuario] = useState('');
	const [contraseña, setContraseña] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isRedirecting, setIsRedirecting] = useState(false);

	const getHomeByRole = (role: UserRole) => {
		const map: Record<UserRole, string> = {
			Admin: '/',
			Taller: '/supplies',
			QR: '/clock-in',
		};
		return map[role] || '/';
	};

	// Redirect to dashboard after auth state resolved
	React.useEffect(() => {
		if (user && !isRedirecting) {
			setIsRedirecting(true);
			router.push('/');
		}
	}, [user, router, isRedirecting]);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		if (usuario.trim() === '' || contraseña.trim() === '') {
			setError('Por favor, complete todos los campos.');
			return;
		}

		setIsRedirecting(true);

		try {
			const userData = await signIn(usuario, contraseña);

			if (userData?.role) {
				router.replace(getHomeByRole(userData.role));
			} else {
				router.replace('/');
			}
		} catch (err: any) {
			setIsRedirecting(false);
			setError(err?.message || 'Error al iniciar sesión');
		}
	}

	// Mostrar pantalla de carga durante la redirección
	if (isRedirecting) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4F5C4D] to-[#3A3F36]">
				<div className="text-center">
					<div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#FBF7F0] mx-auto mb-4"></div>
					<p className="text-[#FBF7F0] text-lg">Cargando...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4F5C4D] to-[#3A3F36] p-4">
			<div className="w-full max-w-md p-8 rounded-2xl bg-[#FBF7F0]/90 backdrop-blur-md shadow-2xl border border-[#CEC2A8]/50 relative overflow-hidden">
				{/* Glass pane effect */}
				<div className="absolute -top-10 -right-10 w-40 h-40 bg-[#7D8573]/20 rounded-full filter blur-3xl"></div>
				<div className="absolute -bottom-10 -left-10 w-60 h-60 bg-[#6E5341]/10 rounded-full filter blur-3xl"></div>

				{/* Logo and Title */}
				<div className="text-center mb-8">
					<Image
						src="/icons/icon-doce8.png"
						alt="Doce ocho Logo"
						width={60}
						height={60}
						className="mx-auto mb-4"
					/>
					<h1 className="text-3xl font-bold text-[#4F5C4D]">Doce ocho</h1>
					<h3 className="text-lg text-[#6E5341] mt-2">Iniciar sesión</h3>
				</div>

				{/* Login Form */}
				<form onSubmit={onSubmit} className="space-y-5">
					<div className="space-y-1">
						<div className="relative">
							<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<User className="text-gray-400" size={18} />
							</div>
							<Input
								value={usuario}
								onChange={(e) => setUsuario(e.target.value)}
								type="text"
								placeholder="Usuario"
								className="pl-10 bg-[#FBF7F0] text-[#000000] border-[#CEC2A8] focus:ring-2 focus:ring-[#4F5C4D]/40 focus:border-[#4F5C4D] transition-all duration-200 placeholder-[#4F5C4D]/50"
							/>
						</div>
					</div>

					<div className="space-y-1">
						<div className="relative">
							<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Lock className="text-gray-400" size={18} />
							</div>
							<Input
								value={contraseña}
								onChange={(e) => setContraseña(e.target.value)}
								type={showPassword ? 'text' : 'password'}
								placeholder="Contraseña"
								className="pl-10 bg-[#FBF7F0] text-[#000000] border-[#CEC2A8] focus:ring-2 focus:ring-[#4F5C4D]/40 focus:border-[#4F5C4D] transition-all duration-200 placeholder-[#4F5C4D]/50"
							/>
							<button
								type="button"
								onClick={() => setShowPassword((p) => !p)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
								tabIndex={-1}
							>
								{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						</div>
					</div>

					{error && (
						<div className="p-3 bg-[#6E5341]/30 text-[#6E5341] text-sm rounded-lg border border-[#6E5341]/50">
							{error}
						</div>
					)}

					<Button
						type="submit"
						disabled={loading}
						className="w-full py-2 bg-[#4F5C4D] hover:bg-[#3A4538] text-[#FBF7F0] font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
					>
						{loading ? 'Iniciando sesión...' : 'Acceder al sistema'}
					</Button>
				</form>

				<div className="mt-6 text-center text-sm text-[#4F5C4D]/70">
					<p>Sistema de gestión para Doce ocho</p>
				</div>
			</div>
		</div>
	);
}
