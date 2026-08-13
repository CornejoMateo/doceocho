'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

export function BackupButton() {
	const [loading, setLoading] = useState(false);

	const handleBackup = async () => {
		try {
			setLoading(true);

			const response = await fetch('/api/backup', {
				method: 'POST',
			});

			if (!response.ok) {
				throw new Error('No se pudo generar el backup');
			}

			const blob = await response.blob();

			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');

			link.href = url;
			link.download = `backup-${new Date().toISOString().slice(0, 10)}.sql`;

			document.body.appendChild(link);
			link.click();

			link.remove();
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Button onClick={handleBackup} disabled={loading}>
			{loading ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					Generando backup...
				</>
			) : (
				<>
					<Download className="mr-2 h-4 w-4" />
					Crear backup
				</>
			)}
		</Button>
	);
}
