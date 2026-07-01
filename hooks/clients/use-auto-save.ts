import { useState, useEffect, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';

interface UseAutoSaveOptions {
	onSave: (value: string) => Promise<{ data?: any; error?: any }>;
	debounceMs?: number;
	successMessage?: string;
	errorMessage?: string;
}

export function useAutoSave({
	onSave,
	debounceMs = 1000,
	successMessage = 'Guardado automático',
	errorMessage = 'Error al guardar',
}: UseAutoSaveOptions) {
	const [isSaving, setIsSaving] = useState(false);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [currentValue, setCurrentValue] = useState('');
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const triggerSave = async (value: string) => {
		try {
			setIsSaving(true);
			const { data, error } = await onSave(value);

			// use translateError
			if (error) {
				console.error('Error saving:', error);
				toast({
					variant: 'destructive',
					title: errorMessage,
					description: translateError(error),
				});
				return { error };
			}

			setHasUnsavedChanges(false);

			toast({
				title: successMessage,
			});

			return { data };
		} catch (error) {
			console.error('Error saving:', error);
			toast({
				variant: 'destructive',
				title: errorMessage,
				description: translateError(error),
			});
			return { error };
		} finally {
			setIsSaving(false);
		}
	};

	const handleChange = (value: string) => {
		// Only proceed if value actually changed
		if (value === currentValue) return;

		console.log('AutoSave: Value changed from', currentValue, 'to', value);

		setCurrentValue(value);
		setHasUnsavedChanges(true);

		// Clear existing timeout
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
			console.log('AutoSave: Cleared existing timeout');
		}

		// Set new timeout to auto-save after debounceMs
		console.log('AutoSave: Setting new timeout for', debounceMs, 'ms');
		saveTimeoutRef.current = setTimeout(() => {
			console.log('AutoSave: Triggering save for value:', value);
			triggerSave(value);
		}, debounceMs);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();

			// Clear existing timeout
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}

			// Save immediately on Enter
			triggerSave(currentValue);
		}
	};

	const setValue = (value: string) => {
		setCurrentValue(value);
		setHasUnsavedChanges(false);
	};

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, []);

	return {
		isSaving,
		hasUnsavedChanges,
		value: currentValue,
		handleChange,
		handleKeyDown,
		triggerSave,
		setValue,
	};
}
