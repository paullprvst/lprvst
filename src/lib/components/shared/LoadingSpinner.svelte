<script lang="ts">
	interface Props {
		size?: 'sm' | 'md' | 'lg';
		color?: 'primary' | 'white';
	}

	let { size = 'md', color = 'primary' }: Props = $props();

	const sizeClasses = {
		sm: 'w-4 h-4 border-2',
		md: 'w-8 h-8 border-3',
		lg: 'w-12 h-12 border-4'
	};

	const colorClasses = {
		primary: 'border-[rgb(var(--color-primary)/0.2)] border-t-[rgb(var(--color-primary))]',
		white: 'border-white/30 border-t-white'
	};
</script>

<div class="flex items-center justify-center" role="status" aria-label="Loading">
	<div class="{sizeClasses[size]} {colorClasses[color]} rounded-full animate-spin"></div>
</div>
