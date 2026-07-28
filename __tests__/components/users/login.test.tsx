import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginPage from '@/components/business/users/login';
import { useAuth } from '@/components/provider/auth-provider';

jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: jest.fn(),
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, type, ...props }: any) => (
		<button type={type || 'button'} onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/input', () => ({
	Input: (props: any) => <input {...props} />,
}));

const mockRouter = {
	push: jest.fn(),
	replace: jest.fn(),
};

jest.mock('next/navigation', () => ({
	useRouter: () => mockRouter,
}));

function setupAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
	const defaults: ReturnType<typeof useAuth> = {
		user: null,
		loading: false,
		signIn: jest.fn(),
		signOutUser: jest.fn(),
	};
	(useAuth as jest.Mock).mockReturnValue({ ...defaults, ...overrides });
}

describe('LoginPage', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockRouter.push.mockReset();
		mockRouter.replace.mockReset();
		setupAuth();
	});

	it('renders the login form with all elements', () => {
		render(<LoginPage />);

		expect(screen.getByText('Doce ocho')).toBeInTheDocument();
		expect(screen.getByText('Iniciar sesión')).toBeInTheDocument();
		expect(screen.getByPlaceholderText('Usuario')).toBeInTheDocument();
		expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument();
		expect(screen.getByText('Acceder al sistema')).toBeInTheDocument();
	});

	it('shows error when submitting empty fields', () => {
		render(<LoginPage />);

		fireEvent.click(screen.getByText('Acceder al sistema'));

		expect(screen.getByText('Por favor, complete todos los campos.')).toBeInTheDocument();
	});

	it('calls signIn with the correct credentials', async () => {
		const signIn = jest.fn().mockResolvedValue({
			username: 'admin1',
			role: 'Admin',
			name: 'Admin',
			last_name: 'User',
			id: 'some-uid',
		});
		setupAuth({ signIn });

		render(<LoginPage />);

		fireEvent.change(screen.getByPlaceholderText('Usuario'), { target: { value: 'admin1' } });
		fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: '123456' } });
		fireEvent.click(screen.getByText('Acceder al sistema'));

		await waitFor(() => {
			expect(signIn).toHaveBeenCalledWith('admin1', '123456');
		});
	});

	it('redirects Admin to "/" after successful login', async () => {
		const signIn = jest.fn().mockResolvedValue({
			username: 'admin1',
			role: 'Admin',
			name: 'Admin',
			last_name: 'User',
			id: 'some-uid',
		});
		setupAuth({ signIn });

		render(<LoginPage />);

		fireEvent.change(screen.getByPlaceholderText('Usuario'), { target: { value: 'admin1' } });
		fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: '123456' } });
		fireEvent.click(screen.getByText('Acceder al sistema'));

		await waitFor(() => {
			expect(mockRouter.replace).toHaveBeenCalledWith('/');
		});
	});

	it('redirects Taller to "/supplies" after successful login', async () => {
		const signIn = jest.fn().mockResolvedValue({
			username: 'taller1',
			role: 'Taller',
			name: 'Taller',
			last_name: 'User',
			id: 'some-uid',
		});
		setupAuth({ signIn });

		render(<LoginPage />);

		fireEvent.change(screen.getByPlaceholderText('Usuario'), { target: { value: 'taller1' } });
		fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: '123456' } });
		fireEvent.click(screen.getByText('Acceder al sistema'));

		await waitFor(() => {
			expect(mockRouter.replace).toHaveBeenCalledWith('/supplies');
		});
	});

	it('shows error message when login fails', async () => {
		const signIn = jest.fn().mockRejectedValue(new Error('Usuario o contraseña incorrectos'));
		setupAuth({ signIn });

		render(<LoginPage />);

		fireEvent.change(screen.getByPlaceholderText('Usuario'), { target: { value: 'bad' } });
		fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'wrong' } });
		fireEvent.click(screen.getByText('Acceder al sistema'));

		await waitFor(() => {
			expect(screen.getByText('Usuario o contraseña incorrectos')).toBeInTheDocument();
		});
	});

	it('toggles password visibility', () => {
		render(<LoginPage />);

		const passwordInput = screen.getByPlaceholderText('Contraseña');
		expect(passwordInput).toHaveAttribute('type', 'password');

		fireEvent.click(screen.getByRole('button', { name: '' }));
		expect(passwordInput).toHaveAttribute('type', 'text');

		fireEvent.click(screen.getByRole('button', { name: '' }));
		expect(passwordInput).toHaveAttribute('type', 'password');
	});

	it('shows loading spinner during redirect', () => {
		setupAuth({ user: null, loading: false });
		const signIn = jest.fn().mockImplementation(() => new Promise(() => {}));
		setupAuth({ signIn });

		render(<LoginPage />);

		fireEvent.change(screen.getByPlaceholderText('Usuario'), { target: { value: 'admin' } });
		fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'pass' } });
		fireEvent.click(screen.getByText('Acceder al sistema'));

		expect(screen.getByText('Iniciando sesión...')).toBeInTheDocument();
	});

	it('redirects automatically if user is already authenticated', () => {
		setupAuth({
			user: { username: 'admin1', role: 'Admin', name: 'Admin', last_name: 'User', id: 'some-uid' },
			loading: false,
		});

		render(<LoginPage />);

		expect(mockRouter.push).toHaveBeenCalledWith('/');
		expect(screen.getByText('Iniciando sesión...')).toBeInTheDocument();
	});

	it('does not redirect while loading is true', () => {
		setupAuth({ user: null, loading: true });

		render(<LoginPage />);

		expect(mockRouter.push).not.toHaveBeenCalled();
	});

	it('disables the submit button while loading', () => {
		setupAuth({ loading: true });

		render(<LoginPage />);

		expect(screen.getByText('Iniciando sesión...')).toBeDisabled();
	});
});
