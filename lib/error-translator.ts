export const translateError = (error: any): string => {
	const errorMessage = error?.message || String(error);

	// Network errors
	if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
		return 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.';
	}
	if (errorMessage.includes('Network request failed')) {
		return 'La solicitud de red falló. Verifica tu conexión a internet.';
	}
	if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
		return 'La solicitud tardó demasiado. Intenta nuevamente.';
	}
	if (errorMessage.includes('offline')) {
		return 'Sin conexión a internet. Verifica tu conexión.';
	}

	// Common HTTP errors
	if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
		return 'No tienes autorización. Inicia sesión nuevamente.';
	}
	if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
		return 'No tienes permisos para realizar esta acción.';
	}
	if (errorMessage.includes('404') || errorMessage.includes('Not found')) {
		return 'No se encontró el recurso solicitado.';
	}
	if (errorMessage.includes('500') || errorMessage.includes('Internal server error')) {
		return 'Error del servidor. Intenta nuevamente más tarde.';
	}
	if (errorMessage.includes('502') || errorMessage.includes('Bad gateway')) {
		return 'El servidor no está disponible. Intenta más tarde.';
	}
	if (errorMessage.includes('503') || errorMessage.includes('Service unavailable')) {
		return 'El servicio no está disponible temporalmente.';
	}

	// Database errors
	if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
		return 'Ya existe un registro con estos datos.';
	}
	if (errorMessage.includes('foreign key constraint')) {
		return 'No se puede completar la operación ya que el dato que desea eliminar esta asociado a otros datos.';
	}
	if (errorMessage.includes('violates check constraint')) {
		return 'Los datos no cumplen con las validaciones requeridas.';
	}
	if (errorMessage.includes('cannot coerce') || errorMessage.includes('single JSON object')) {
		return 'Error al procesar la solicitud. Intenta nuevamente.';
	}

	// Geolocation errors
	if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('permiso de ubicación')) {
		return 'Permiso de ubicación denegado. Habilita la geolocalización en tu navegador.';
	}
	if (
		errorMessage.includes('POSITION_UNAVAILABLE') ||
		errorMessage.includes('ubicación no disponible')
	) {
		return 'Ubicación no disponible. Verifica tu GPS o conexión.';
	}
	if (errorMessage.includes('TIMEOUT') || errorMessage.includes('tiempo de espera')) {
		return 'Tiempo de espera agotado al obtener ubicación. Intenta nuevamente.';
	}
	if (
		errorMessage.includes('kCLErrorLocationUnknown') ||
		errorMessage.includes('location unknown')
	) {
		return 'No se pudo determinar tu ubicación. Verifica los servicios de ubicación de tu dispositivo.';
	}

	// Validation errors
	if (errorMessage.includes('required') || errorMessage.includes('is required')) {
		return 'Faltan campos obligatorios.';
	}
	if (errorMessage.includes('invalid') && errorMessage.includes('email')) {
		return 'El correo electrónico no es válido.';
	}
	if (errorMessage.includes('Usuario no autenticado')) {
		return 'Usuario no autenticado. Inicia sesión para continuar.';
	}
	if (errorMessage.includes('Debes estar dentro del área permitida')) {
		return 'Debes estar dentro del área permitida para fichar.';
	}
	if (errorMessage.includes('No se pudo crear el registro de asistencia')) {
		return 'No se pudo crear el registro de asistencia. Intenta nuevamente.';
	}
	if (errorMessage.includes('Debes seleccionar un empleado primero')) {
		return 'Debes seleccionar un empleado primero.';
	}
	if (errorMessage.includes('La fecha y hora son requeridas')) {
		return 'La fecha y hora son requeridas.';
	}
	if (errorMessage.includes('La hora debe tener formato HH:MM')) {
		return 'La hora debe tener formato HH:MM.';
	}
	if (errorMessage.includes('Error al procesar la solicitud')) {
		return 'Error al procesar la solicitud. Intenta nuevamente.';
	}
	if (errorMessage.includes('El radio debe ser al menos')) {
		return 'El radio debe ser al menos el valor mínimo de seguridad.';
	}

	// File/Upload errors
	if (errorMessage.includes('file too large') || errorMessage.includes('size exceeded')) {
		return 'El archivo es demasiado grande.';
	}
	if (errorMessage.includes('invalid file type')) {
		return 'Tipo de archivo no permitido.';
	}
	if (
		errorMessage.includes('The resource already exists') ||
		errorMessage.includes('the resource already exists')
	) {
		return 'Ya existe un archivo con ese nombre. Intenta nuevamente o usa otro archivo.';
	}

	// RLS errors
	if (errorMessage.includes('RLS policy') || errorMessage.includes('row-level security')) {
		return 'No tienes permisos para realizar esta acción.';
	}

	// Return original message if no translation found
	return errorMessage || 'Ocurrió un error inesperado.';
};
