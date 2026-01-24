<script lang="ts">
	interface Props {
		padding?: 'sm' | 'md' | 'lg';
		children: import('svelte').Snippet;
	}

	let { padding = 'md', children }: Props = $props();

	const paddingClasses = {
		sm: 'p-3',
		md: 'p-4',
		lg: 'p-6'
	};
</script>

<div class="bg-white rounded-lg shadow {paddingClasses[padding]}">
	{@render children()}
</div>
