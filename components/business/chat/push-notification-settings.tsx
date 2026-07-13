'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CHAT_CONSTANTS } from '../../../constants/chat/chat.constants';

interface PushNotificationSettingsProps {
	isSupported: boolean;
	permission: NotificationPermission;
	subscription: any;
	onRequestPermission: () => Promise<{ success: boolean }>;
	onSubscribe: () => Promise<{ success: boolean; error?: any }>;
	onUnsubscribe: () => Promise<{ success: boolean; error?: any }>;
}

export function PushNotificationSettings({
	isSupported,
	permission,
	subscription,
	onRequestPermission,
	onSubscribe,
	onUnsubscribe,
}: PushNotificationSettingsProps) {
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleEnable = async () => {
		setError(null);
		const result = await onRequestPermission();
		if (result.success) {
			setLoading(true);
			const subResult = await onSubscribe();
			setLoading(false);
			if (!subResult.success) {
				setError(subResult.error || 'Error al suscribirse');
			}
		}
	};

	const handleSubscribe = async () => {
		setError(null);
		setLoading(true);
		const result = await onSubscribe();
		setLoading(false);
		if (!result.success) {
			setError(result.error || 'Error al suscribirse');
		}
	};

	if (!isSupported) return null;

	return (
		<div className="p-2 bg-muted rounded mb-4">
			{error && <p className="text-xs text-destructive mb-2">{error}</p>}
			{permission === 'default' && (
				<Button
					size="sm"
					variant="outline"
					className="w-full"
					disabled={loading}
					onClick={handleEnable}
				>
					{loading ? 'Activando...' : CHAT_CONSTANTS.PUSH_NOTIFICATIONS.ENABLE}
				</Button>
			)}
			{permission === 'granted' && (
				<div className="flex items-center justify-between">
					<span className="text-xs text-muted-foreground">
						{subscription
							? CHAT_CONSTANTS.PUSH_NOTIFICATIONS.ENABLED
							: CHAT_CONSTANTS.PUSH_NOTIFICATIONS.SUBSCRIBE}
					</span>
					{subscription ? (
						<Button size="sm" variant="ghost" onClick={onUnsubscribe} className="h-6 text-xs">
							{CHAT_CONSTANTS.PUSH_NOTIFICATIONS.UNSUBSCRIBE}
						</Button>
					) : (
						<Button
							size="sm"
							variant="ghost"
							disabled={loading}
							onClick={handleSubscribe}
							className="h-6 text-xs"
						>
							{loading ? 'Activando...' : CHAT_CONSTANTS.PUSH_NOTIFICATIONS.SUBSCRIBE}
						</Button>
					)}
				</div>
			)}
			{permission === 'denied' && (
				<span className="text-xs text-destructive">
					{CHAT_CONSTANTS.PUSH_NOTIFICATIONS.BLOCKED}
				</span>
			)}
		</div>
	);
}
