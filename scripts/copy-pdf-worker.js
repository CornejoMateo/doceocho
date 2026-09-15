/**
 * Copies the pdf.js worker into public/ so the browser can load it from a plain
 * path. Keeping it out of the bundle avoids `import.meta.url`, which the test
 * environment cannot parse, and the copy always matches the installed version.
 */
const fs = require('fs');
const path = require('path');

const source = path.join(
	__dirname,
	'..',
	'node_modules',
	'pdfjs-dist',
	'build',
	'pdf.worker.min.mjs'
);
const destination = path.join(__dirname, '..', 'public', 'pdf.worker.min.mjs');

if (!fs.existsSync(source)) {
	console.error('[copy-pdf-worker] pdfjs-dist is not installed, skipping.');
	process.exit(0);
}

fs.copyFileSync(source, destination);
console.log('[copy-pdf-worker] public/pdf.worker.min.mjs updated.');
