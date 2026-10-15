import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
	EntityCombobox,
	EntityComboboxOption,
} from '@/components/business/cash-flow/shared/entity-combobox';

const OPTIONS: EntityComboboxOption[] = [
	{ id: 1, label: 'Cliente Pérez' },
	{ id: 2, label: 'Cliente Gómez' },
];

function Controlled({
	options,
	disabled,
}: {
	options: EntityComboboxOption[];
	disabled?: boolean;
}) {
	const [value, setValue] = useState('');
	return (
		<EntityCombobox
			value={value}
			onValueChange={setValue}
			options={options}
			placeholder="Selecciona una opción"
			disabled={disabled}
		/>
	);
}

describe('EntityCombobox', () => {
	it('shows the placeholder when nothing is selected', () => {
		render(
			<EntityCombobox
				value=""
				onValueChange={jest.fn()}
				options={OPTIONS}
				placeholder="Elegí uno"
			/>
		);

		expect(screen.getByRole('combobox')).toHaveTextContent('Elegí uno');
	});

	it('shows the label of the selected option', () => {
		render(
			<EntityCombobox
				value="2"
				onValueChange={jest.fn()}
				options={OPTIONS}
				placeholder="Elegí uno"
			/>
		);

		expect(screen.getByRole('combobox')).toHaveTextContent('Cliente Gómez');
	});

	it('is disabled when the disabled prop is true', () => {
		render(
			<EntityCombobox
				value=""
				onValueChange={jest.fn()}
				options={OPTIONS}
				placeholder="Elegí uno"
				disabled
			/>
		);

		expect(screen.getByRole('combobox')).toBeDisabled();
	});

	it('opens the list, filters by typed text and selects the matching option by id', async () => {
		const user = userEvent.setup();
		render(<Controlled options={OPTIONS} />);

		await user.click(screen.getByRole('combobox'));
		await user.type(screen.getByPlaceholderText('Buscar...'), 'Gómez');

		const option = await screen.findByText('Cliente Gómez');
		await user.click(option);

		expect(screen.getByRole('combobox')).toHaveTextContent('Cliente Gómez');
	});

	it('shows the empty label when the search has no matches', async () => {
		const user = userEvent.setup();
		render(
			<EntityCombobox
				value=""
				onValueChange={jest.fn()}
				options={OPTIONS}
				placeholder="Elegí uno"
				emptyLabel="No se encontraron resultados"
			/>
		);

		await user.click(screen.getByRole('combobox'));
		await user.type(screen.getByPlaceholderText('Buscar...'), 'Inexistente');

		expect(await screen.findByText('No se encontraron resultados')).toBeInTheDocument();
	});

	it('distinguishes two options that share the same label and selects the clicked one', async () => {
		const user = userEvent.setup();
		const sameNameOptions: EntityComboboxOption[] = [
			{ id: 10, label: 'Juan Pérez' },
			{ id: 11, label: 'Juan Pérez' },
		];
		render(<Controlled options={sameNameOptions} />);

		await user.click(screen.getByRole('combobox'));
		const matches = await screen.findAllByText('Juan Pérez');
		expect(matches).toHaveLength(2);

		await user.click(matches[1]);

		expect(screen.getByRole('combobox')).toHaveTextContent('Juan Pérez');
	});
});
