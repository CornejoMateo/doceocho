import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.QR_SECRET_KEY!);
console.log('QR_SECRET_KEY:', process.env.QR_SECRET_KEY);
console.log('SECRET LENGTH:', secret.length);

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
	const { payload } = await jwtVerify(token, secret);

	const currentWindow = Math.floor(Date.now() / 60000);

	if (payload.window !== currentWindow && payload.window !== currentWindow - 1) {
		throw new Error('QR expirado');
	}

	return payload;
}
