/** Where each pending-action tile takes the user. */
export const PENDING_ACTION_ROUTES = {
	appointments: '/calendar',
	vacations: '/employees?tab=vacaciones',
	signatures: '/clients',
	receivables: '/reports',
} as const;
