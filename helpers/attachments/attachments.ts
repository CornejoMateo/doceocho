export const pluralFiles = (count: number) => `${count} ${count === 1 ? 'archivo' : 'archivos'}`;
export const attachments = (count: number) => (count === 1 ? 'Se adjuntó' : 'Se adjuntaron');
export const notAttachments = (count: number) =>
	count === 1 ? 'no se pudo adjuntar' : 'no se pudieron adjuntar';
