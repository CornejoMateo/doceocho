'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/provider/auth-provider';
import { AttendanceHistory } from './attendance-history';
import { AdminAttendanceHistory } from './admin-attendance-history';
import { AttendanceSettings } from './attendance-settings';
import { AttendanceEntryModal } from './attendance-entry-modal';
import { SettlementsModal } from './settlements/settlements-modal';
import { Settings } from 'lucide-react';
import type { User } from '@/lib/users/users';
import { isAdminRole, isSuperadmin } from '@/constants/users/user-role';

// Historial de fichajes: Admin manages everyone's attendance; Taller sees own history.
export function AttendanceHistoryTab({ users = [] }: { users?: User[] }) {
	const adminHistoryRef = useRef<{ loadHistory: () => Promise<void> }>(null);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [createEntryModalOpen, setCreateEntryModalOpen] = useState(false);
	const [settlementsModalOpen, setSettlementsModalOpen] = useState(false);

	const { user } = useAuth();

	const isAdmin = isAdminRole(user?.role);
	const isTaller = user?.role === 'Taller';
	const canManageOthersAttendance = isSuperadmin(user?.role);

	return (
		<div className="min-w-0">
			<div className="grid gap-4 md:gap-6 min-w-0">
				{isAdmin && (
					<>
						<div className="flex flex-col sm:flex-row justify-center sm:justify-end gap-2 mb-4">
							{canManageOthersAttendance && (
								<Button
									variant="outline"
									onClick={() => setCreateEntryModalOpen(true)}
									type="button"
								>
									Crear registro
								</Button>
							)}
							{canManageOthersAttendance && (
								<Button
									variant="outline"
									onClick={() => setSettlementsModalOpen(true)}
									type="button"
								>
									Liquidaciones
								</Button>
							)}
							<Button variant="outline" onClick={() => setSettingsOpen(true)} type="button">
								<Settings className="h-4 w-4 mr-2" />
								Configuración
							</Button>
						</div>
						<AdminAttendanceHistory
							ref={adminHistoryRef}
							users={users}
							canManageOthersAttendance={canManageOthersAttendance}
						/>
					</>
				)}
				{isTaller && (
					<div className="w-full max-w-2xl mx-auto">
						<AttendanceHistory />
					</div>
				)}
			</div>
			<AttendanceSettings
				open={settingsOpen}
				onOpenChange={(open) => {
					setSettingsOpen(open);
				}}
			/>
			{canManageOthersAttendance && (
				<AttendanceEntryModal
					entry={null}
					open={createEntryModalOpen}
					onOpenChange={setCreateEntryModalOpen}
					onUpdate={() => {
						adminHistoryRef.current?.loadHistory();
					}}
					showUserSelect={true}
					users={users}
				/>
			)}
			{canManageOthersAttendance && (
				<SettlementsModal
					open={settlementsModalOpen}
					onOpenChange={setSettlementsModalOpen}
					users={users}
				/>
			)}
		</div>
	);
}
