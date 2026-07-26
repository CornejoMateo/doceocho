import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.QR_SECRET_KEY!);

export async function createQRToken() {
	const window = Math.floor(Date.now() / 60000);

	return await new SignJWT({
		window,
	})
		.setProtectedHeader({
			alg: 'HS256',
		})
		.setIssuedAt()
		.setExpirationTime('70s')
		.sign(secret);
}

export async function verifyQRToken(token: string) {
	console.log('ANTES DE JWT VERIFY');

	const result = await jwtVerify(token, secret);

	console.log('DESPUES DE JWT VERIFY', result);

	const { payload } = result;

	const currentWindow = Math.floor(Date.now() / 60000);

	console.log({
		payloadWindow: payload.window,
		currentWindow,
	});

	if (payload.window !== currentWindow && payload.window !== currentWindow - 1) {
		throw new Error('QR expirado');
	}

	return payload;
}
