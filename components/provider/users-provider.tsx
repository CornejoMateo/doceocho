'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from '@/components/provider/auth-provider';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { listUsers, User } from '@/lib/users/users';

type UsersContextType = {
	users: User[];
	loading: boolean;
	error: string | null;
	refresh: () => void;
};

const UsersContext = createContext<UsersContextType | null>(null);

export function UsersProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();

	const isAdmin = user?.role === 'Admin';

	const {
		data: users,
		loading,
		error,
		refresh,
	} = useOptimizedRealtime<User>(
		'users',
		async () => {
			const { data, error } = await listUsers();
			if (error) throw error;
			return data ?? [];
		},
		'users_cache',
		isAdmin
	);

	const value = useMemo(
		() => ({ users, loading, error, refresh }),
		[users, loading, error, refresh]
	);

	return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsers() {
	const context = useContext(UsersContext);

	if (!context) {
		throw new Error('useUsers must be used within a UsersProvider');
	}

	return context;
}
