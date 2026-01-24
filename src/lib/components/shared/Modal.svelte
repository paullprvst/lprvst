<script lang="ts">
	interface Props {
		open: boolean;
		title?: string;
		children: import('svelte').Snippet;
		onclose?: () => void;
	}

	let { open = $bindable(), title, children, onclose }: Props = $props();

	function handleClose() {
		open = false;
		onclose?.();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
		onclick={handleBackdropClick}
		role="button"
		tabindex="-1"
	>
		<div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			{#if title}
				<div class="flex items-center justify-between p-4 border-b">
					<h2 class="text-xl font-semibold">{title}</h2>
					<button
						onclick={handleClose}
						class="text-gray-400 hover:text-gray-600 touch-target"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/if}
			<div class="p-4">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
