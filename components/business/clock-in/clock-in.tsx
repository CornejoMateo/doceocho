'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function ClockIn() {
	const [isClockedIn, setIsClockedIn] = useState(false);

	const handleToggle = () => {
		setIsClockedIn(!isClockedIn);
	};

	return (
		<div className="flex items-center justify-center p-8">
			<Button onClick={handleToggle} size="lg" className="text-lg px-8 py-6">
				{isClockedIn ? 'Registrar salida' : 'Registrar entrada'}
			</Button>
		</div>
	);
}
