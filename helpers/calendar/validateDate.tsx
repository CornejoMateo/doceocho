export function validateDate(date: Date | undefined): string | null {
	if (!date) {
		return 'La fecha es requerida';
	}

	return null;
}
