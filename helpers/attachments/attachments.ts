export const pluralArchivos = (count: number) => `${count} ${count === 1 ? 'archivo' : 'archivos'}`;
export const adjuntaron = (count: number) => (count === 1 ? 'Se adjuntó' : 'Se adjuntaron');
export const noPudieronAdjuntar = (count: number) =>
	count === 1 ? 'no se pudo adjuntar' : 'no se pudieron adjuntar';
