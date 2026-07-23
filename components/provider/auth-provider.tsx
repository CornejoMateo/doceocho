'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { UserRole } from '@/constants/users/user-role';
import { getSupabaseClient } from '@/lib/supabase-client';
import { clearChannelsCache } from '@/hooks/chat/use-chat-management';

type SessionUser = {
	username: string;
	name: string;
	last_name: string;
	role: UserRole;
	uid: string;
};

type AuthContextType = {
	user: SessionUser | null;
	loading: boolean;
	signIn: (username: string, password: string) => Promise<SessionUser>;
	signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchProfile(token: string): Promise<SessionUser | null> {
	const res = await fetch('/api/me', {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (!res.ok) {
		console.error('[API /me]', {
			status: res.status,
			statusText: res.statusText,
			body: await res.text(),
		});

		return null;
	}

	const json = await res.json();

	console.log('[API /me]', json);

	if (!json.data) {
		console.warn('[API /me] Sin data', json);
		return null;
	}

	return {
		username: json.data.username,
		role: json.data.role,
		name: json.data.name || '-',
		last_name: json.data.last_name || '-',
		uid: json.data.uid_user || '',
	};
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<SessionUser | null>(null);
	const [loading, setLoading] = useState(true);
	const supabase = getSupabaseClient();

	const router = useRouter();
	const loadProfile = useCallback(async () => {
		const {
			data: { session },
			error,
		} = await supabase.auth.getSession();

		console.log('[GET SESSION]', {
			hasSession: !!session,
			error,
		});

		if (!session) {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			console.log('[AUTH] getUser()', {
				hasUser: !!user,
			});

			if (!user) {
				setUser(null);
			}

			return;
		}

		try {
			const profile = await fetchProfile(session.access_token);

			if (profile) {
				setUser(profile);
			} else {
				console.warn('[AUTH] Session válida, pero no se pudo cargar el perfil');
				return;
			}
		} catch (err) {
			console.error('Error loading profile:', err);
		}
	}, [supabase]);

	useEffect(() => {
		let cancelled = false;

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			console.log('[AUTH EVENT]', {
				event,
				hasSession: !!session,
				userId: session?.user?.id,
				expiresAt: session?.expires_at,
				now: Math.floor(Date.now() / 1000),
				expiresIn: session?.expires_at ? session.expires_at - Math.floor(Date.now() / 1000) : null,
			});

			if (cancelled) return;

			try {
				if (event !== 'TOKEN_REFRESHED' && event !== 'SIGNED_OUT') {
					await loadProfile();
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		});

		return () => {
			cancelled = true;
			subscription.unsubscribe();
		};
	}, [supabase, loadProfile]);

	async function signIn(username: string, password: string): Promise<SessionUser> {
		setLoading(true);

		try {
			const response = await fetch('/api/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username }),
			});

			const res = await response.json();

			if (!response.ok || !res.data) {
				throw new Error(res.error || 'Usuario o contraseña incorrectos');
			}

			const { error } = await supabase.auth.signInWithPassword({
				email: res.data.mail,
				password,
			});

			if (error) {
				throw new Error('Usuario o contraseña incorrectos');
			}

			const sessionUser: SessionUser = {
				username: res.data.username,
				role: res.data.role as UserRole,
				name: res.data.name || '-',
				last_name: res.data.last_name || '-',
				uid: res.data.uid_user || '',
			};

			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (!session) {
				throw new Error('No se pudo obtener la sesión');
			}
			await loadProfile();
			return sessionUser;
		} catch (err: any) {
			throw err;
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		const interval = setInterval(async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();

			console.log('[SESSION]', {
				expiresAt: session?.expires_at,
				remaining: session?.expires_at && session.expires_at - Math.floor(Date.now() / 1000),
			});
		}, 60_000);

		return () => clearInterval(interval);
	}, []);

	async function signOutUser() {
		console.log('[AUTH] signOut()');
		setLoading(true);

		clearChannelsCache();

		try {
			await supabase.auth.signOut({
				scope: 'local',
			});

			setUser(null);

			router.push('/login');
			router.refresh();
		} finally {
			setLoading(false);
		}
	}

	return (
		<AuthContext.Provider
			value={{
				user,
				loading,
				signIn,
				signOutUser,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = useContext(AuthContext);

	if (!ctx) {
		throw new Error('useAuth must be used within AuthProvider');
	}

	return ctx;
}
