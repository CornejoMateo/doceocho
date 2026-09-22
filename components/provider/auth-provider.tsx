'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { UserRole } from '@/constants/users/user-role';
import { getSupabaseClient } from '@/lib/supabase-client';
import { clearChannelsCache } from '@/hooks/chat/use-chat-management';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/use-toast';

// Timeout values for auth checks. The outer timeout is slightly longer than the inner timeout
// to allow for the fetchProfile call to complete before the outer timeout triggers.
const AUTH_TIMEOUT_MS = 10000;

const AUTH_OUTER_TIMEOUT_MS = AUTH_TIMEOUT_MS + 2000;

class AuthTimeoutError extends Error {
	constructor() {
		super('Auth check timed out');
		this.name = 'AuthTimeoutError';
	}
}

// Races an arbitrary promise against a timeout, without altering the original
// promise's resolution/rejection behavior when it settles first.
function withAuthTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timeoutId = setTimeout(() => reject(new AuthTimeoutError()), ms);

		promise.then(
			(value) => {
				clearTimeout(timeoutId);
				resolve(value);
			},
			(err) => {
				clearTimeout(timeoutId);
				reject(err);
			}
		);
	});
}

export type SessionUser = {
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
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

	try {
		const res = await fetch('/api/me', {
			headers: {
				Authorization: `Bearer ${token}`,
			},
			signal: controller.signal,
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
	} catch (err) {
		console.error('[API /me] fetch failed or timed out', err);
		return null;
	} finally {
		clearTimeout(timeoutId);
	}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<SessionUser | null>(null);
	const [loading, setLoading] = useState(true);
	const [initializing, setInitializing] = useState(true);
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
			if (cancelled) return;

			try {
				switch (event) {
					case 'SIGNED_IN':
					case 'INITIAL_SESSION':
						try {
							await withAuthTimeout(loadProfile(), AUTH_OUTER_TIMEOUT_MS);
						} catch (err) {
							if (err instanceof AuthTimeoutError) {
								console.error('[AUTH] loadProfile timed out', err);

								if (!cancelled) {
									setUser(null);
									toast({
										title: 'Error',
										description: 'No se pudo verificar tu sesión. Revisá tu conexión.',
										variant: 'destructive',
									});
								}
							} else {
								throw err;
							}
						} finally {
							if (!cancelled) {
								setLoading(false);
							}
						}
						break;

					case 'SIGNED_OUT':
						setUser(null);
						setLoading(false);
						break;

					case 'TOKEN_REFRESHED':
						break;
				}
			} finally {
				if (!cancelled) {
					setInitializing(false);
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

	async function signOutUser() {
		setLoading(true);

		clearChannelsCache();

		try {
			localStorage.removeItem('users_cache');
		} catch {
			// localStorage access can throw (e.g. disabled storage); safe to ignore.
		}

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
			{initializing ? (
				<div className="flex min-h-screen items-center justify-center bg-background">
					<Spinner className="h-6 w-6" />
				</div>
			) : (
				children
			)}
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
