export type SignatureStatus = 'Pendiente' | 'Firmado' | 'Cancelado';

export const SIGNATURE_STATUS_VARIANTS: Record<
	SignatureStatus,
	'default' | 'secondary' | 'destructive' | 'outline'
> = {
	Pendiente: 'outline',
	Firmado: 'default',
	Cancelado: 'secondary',
};

/** Public page where the client signs. */
export const SIGNING_PATH = '/firmar';

/** Default signature box, as a fraction of the page. */
export const DEFAULT_SIGNATURE_WIDTH = 0.25;
export const DEFAULT_SIGNATURE_HEIGHT = 0.08;

/** Keeps a box from being dragged so small it cannot hold a signature. */
export const MIN_SIGNATURE_WIDTH = 0.08;
export const MIN_SIGNATURE_HEIGHT = 0.03;

/** The signature drawing is sent as a PNG data URL; this caps its size. */
export const MAX_SIGNATURE_IMAGE_BYTES = 2 * 1024 * 1024;

export const SIGNATURE_LINK_DAYS_VALID = 30;
