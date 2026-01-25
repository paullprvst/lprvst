<script lang="ts">
	interface Props {
		variant?: 'text' | 'card' | 'avatar' | 'button' | 'circular';
		width?: string;
		height?: string;
		lines?: number;
		className?: string;
	}

	let { variant = 'text', width, height, lines = 1, className = '' }: Props = $props();

	const baseClasses = 'animate-shimmer rounded';

	const variantStyles = {
		text: {
			class: 'h-4 rounded',
			style: ''
		},
		card: {
			class: 'rounded-xl',
			style: 'height: 120px;'
		},
		avatar: {
			class: 'rounded-full',
			style: 'width: 48px; height: 48px;'
		},
		button: {
			class: 'rounded-xl',
			style: 'height: 44px; width: 100px;'
		},
		circular: {
			class: 'rounded-full',
			style: ''
		}
	};

	const computedStyle = $derived(() => {
		let style = variantStyles[variant].style;
		if (width) style += ` width: ${width};`;
		if (height) style += ` height: ${height};`;
		return style;
	});
</script>

{#if variant === 'text' && lines > 1}
	<div class="space-y-2 {className}">
		{#each Array(lines) as _, i}
			<div
				class="{baseClasses} {variantStyles[variant].class}"
				style="{computedStyle()} {i === lines - 1 ? 'width: 70%;' : 'width: 100%;'}"
			></div>
		{/each}
	</div>
{:else}
	<div
		class="{baseClasses} {variantStyles[variant].class} {className}"
		style={computedStyle()}
	></div>
{/if}
