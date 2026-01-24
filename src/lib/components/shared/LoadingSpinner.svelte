<script lang="ts">
	interface Props {
		size?: 'sm' | 'md' | 'lg';
	}

	let { size = 'md' }: Props = $props();

	const sizeClasses = {
		sm: 'w-4 h-4',
		md: 'w-8 h-8',
		lg: 'w-12 h-12'
	};
</script>

<div class="flex items-center justify-center">
	<div class="{sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
</div>
