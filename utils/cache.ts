import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';

export const clearCache = async () => {
	localStorage.clear();
	if ('caches' in window) {
		try {
			const keys = await caches.keys();
			await Promise.all(keys.map((key) => caches.delete(key)));
		} catch (error) {
			console.error('Error clearing caches:', error);
			toast({
				title: 'Error al eliminar la caché',
				description:
					translateError(error) || 'Ocurrió un error al intentar eliminar la caché del navegador.',
				variant: 'destructive',
			});
			return;
		}
	}
	toast({
		title: 'Caché eliminada',
		description: 'La caché del navegador se ha eliminado correctamente.',
	});
	setTimeout(() => location.reload(), 1500);
};
