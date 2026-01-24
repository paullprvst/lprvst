<script lang="ts">
	interface Props {
		variant?: 'primary' | 'secondary' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		fullWidth?: boolean;
		children: import('svelte').Snippet;
		onclick?: () => void;
	}

	let { variant = 'primary', size = 'md', disabled = false, fullWidth = false, children, onclick }: Props = $props();

	const baseClasses = 'font-medium rounded-lg transition-colors touch-target flex items-center justify-center gap-2';

	const variantClasses = {
		primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
		secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:bg-gray-100',
		danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300'
	};

	const sizeClasses = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2 text-base',
		lg: 'px-6 py-3 text-lg'
	};

	const widthClass = $derived(fullWidth ? 'w-full' : '');
</script>

<button
	{onclick}
	{disabled}
	class="{baseClasses} {variantClasses[variant]} {sizeClasses[size]} {widthClass}"
	class:opacity-50={disabled}
	class:cursor-not-allowed={disabled}
>
	{@render children()}
</button>
