<script lang="ts">
	import { X } from 'lucide-svelte';
	import { backdropIn, backdropOut, modalIn, modalOut } from '$lib/utils/transitions';
	import { portal } from '$lib/utils/portal';

	interface Props {
		open: boolean;
		title?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		fullscreen?: boolean;
		flush?: boolean;
		children: import('svelte').Snippet;
		onclose?: () => void;
	}

	let {
		open = $bindable(),
		title,
		size = 'md',
		fullscreen = false,
		flush = false,
		children,
		onclose
	}: Props = $props();

	function handleClose() {
		open = false;
		onclose?.();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}

	function handleBackdropKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleClose();
		}
	}

	const sizeClasses = {
		sm: 'max-w-sm',
		md: 'max-w-lg',
		lg: 'max-w-2xl',
		xl: 'max-w-4xl'
	};
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

{#if open}
	<!-- Backdrop with blur - portaled to body to escape stacking contexts -->
	<div
		use:portal
		class="fixed inset-0 z-[500] bg-black/50 backdrop-blur-sm flex {fullscreen
			? 'items-stretch justify-stretch p-0'
			: 'items-end sm:items-center justify-center p-0 sm:p-4'}"
		onclick={handleBackdropClick}
		onkeydown={handleBackdropKeydown}
		role="button"
		tabindex="0"
		in:backdropIn
		out:backdropOut
	>
		<!-- Modal container -->
		<div
			class="card w-full overflow-hidden flex flex-col {fullscreen
				? 'h-full max-h-none max-w-none rounded-none'
				: `${sizeClasses[size]} max-h-[90vh] rounded-t-2xl sm:rounded-2xl`}"
			in:modalIn
			out:modalOut
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? 'modal-title' : undefined}
		>
			<!-- Mobile drag handle indicator -->
			<div class="sm:hidden flex justify-center pt-3 pb-1 {fullscreen ? 'hidden' : ''}">
				<button
					onclick={handleClose}
					class="w-10 h-1 bg-border-soft rounded-full"
					aria-label="Close modal"
				></button>
			</div>

			<!-- Header -->
			{#if title}
				<div class="flex items-center justify-between px-5 py-4 border-b border-theme">
					<h2 id="modal-title" class="text-lg font-semibold text-primary">{title}</h2>
					<button
						onclick={handleClose}
						class="inline-flex items-center justify-center leading-none p-2 -mr-2 rounded-xl text-secondary hover:text-primary hover:bg-[rgb(var(--color-border)/0.5)] transition-all duration-200 touch-target"
						aria-label="Close modal"
					>
						<X size={20} />
					</button>
				</div>
			{:else}
				<!-- Close button for titleless modals -->
				<button
					onclick={handleClose}
					class="absolute top-3 right-3 inline-flex items-center justify-center leading-none p-2 rounded-xl text-secondary hover:text-primary hover:bg-[rgb(var(--color-border)/0.5)] transition-all duration-200 touch-target z-10"
					aria-label="Close modal"
				>
					<X size={20} />
				</button>
			{/if}

			<!-- Content -->
			<div class="flex-1 {fullscreen || flush ? 'overflow-hidden' : 'overflow-y-auto p-5'}">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
