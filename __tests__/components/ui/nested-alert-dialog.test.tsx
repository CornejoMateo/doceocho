import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Many screens open a confirmation AlertDialog inside a Dialog. If
// @radix-ui/react-alert-dialog and @radix-ui/react-dialog resolve to different
// copies of the Radix dialog internals, their focus traps fight each other and
// Escape is swallowed by the parent. Keep both packages on matching versions.
function NestedDialogs({
	onParentOpenChange,
	onConfirm,
}: {
	onParentOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}) {
	return (
		<Dialog open onOpenChange={onParentOpenChange}>
			<DialogContent>
				<DialogTitle>Parent</DialogTitle>
				<DialogDescription>Parent dialog</DialogDescription>
				<AlertDialog>
					<AlertDialogTrigger>Delete</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogTitle>Are you sure?</AlertDialogTitle>
						<AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
					</AlertDialogContent>
				</AlertDialog>
			</DialogContent>
		</Dialog>
	);
}

async function openAlert() {
	const user = userEvent.setup();
	const onParentOpenChange = jest.fn();
	const onConfirm = jest.fn();
	render(<NestedDialogs onParentOpenChange={onParentOpenChange} onConfirm={onConfirm} />);
	await user.click(screen.getByText('Delete'));
	await screen.findByText('Confirm');
	return { user, onParentOpenChange, onConfirm };
}

describe('AlertDialog nested inside Dialog', () => {
	it('confirms without closing the parent dialog', async () => {
		const { user, onParentOpenChange, onConfirm } = await openAlert();
		await user.click(screen.getByText('Confirm'));
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onParentOpenChange).not.toHaveBeenCalled();
	});

	it('closes only the alert on Escape', async () => {
		const { user, onParentOpenChange } = await openAlert();
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByText('Confirm')).toBeNull());
		expect(onParentOpenChange).not.toHaveBeenCalled();
		expect(screen.getByText('Parent')).toBeInTheDocument();
	});

	it('keeps keyboard focus inside the alert', async () => {
		const { user } = await openAlert();
		for (let i = 0; i < 4; i++) {
			await user.tab();
			expect(['Cancel', 'Confirm']).toContain(document.activeElement?.textContent);
		}
	});
});
