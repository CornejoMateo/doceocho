/** Browser-only helpers to save generated files. */

function clickDownload(href: string, filename: string) {
	const a = document.createElement('a');
	a.href = href;
	a.download = filename;
	a.rel = 'noopener';
	document.body.appendChild(a);
	a.click();
	a.remove();
}

export function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	clickDownload(url, filename);
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
	clickDownload(dataUrl, filename);
}

export function downloadCsv(csv: string, filename: string) {
	downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
}
