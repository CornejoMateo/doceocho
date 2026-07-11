import { useCallback } from 'react';

interface UseOptimisticMutationOptions<TData, TVariables, TError = Error> {
	optimisticUpdate: (variables: TVariables) => void;
	mutationFn: (variables: TVariables) => Promise<{ data?: TData; error?: TError }>;
	onError?: (error: TError, variables: TVariables) => void;
	onSuccess?: (data: TData, variables: TVariables) => void;
	onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables) => void;
}

export function useOptimisticMutation<TData = unknown, TVariables = void, TError = Error>({
	optimisticUpdate,
	mutationFn,
	onError,
	onSuccess,
	onSettled,
}: UseOptimisticMutationOptions<TData, TVariables, TError>) {
	const mutate = useCallback(
		async (variables: TVariables) => {
			// Apply optimistic update immediately
			optimisticUpdate(variables);

			const result = await mutationFn(variables);

			if (result.error) {
				onError?.(result.error, variables);
				onSettled?.(undefined, result.error, variables);
				return { data: undefined, error: result.error };
			}

			if (result.data) {
				onSuccess?.(result.data, variables);
				onSettled?.(result.data, null, variables);
			}

			return result;
		},
		[optimisticUpdate, mutationFn, onError, onSuccess, onSettled]
	);

	return { mutate };
}
