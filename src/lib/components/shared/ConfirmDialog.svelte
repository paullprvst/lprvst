<script lang="ts">
	import Modal from './Modal.svelte';
	import Button from './Button.svelte';

	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		danger?: boolean;
		loading?: boolean;
		onconfirm: () => void | Promise<void>;
		oncancel?: () => void;
	}

	let {
		open = $bindable(),
		title,
		message,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		danger = false,
		loading = false,
		onconfirm,
		oncancel
	}: Props = $props();

	function handleCancel() {
		open = false;
		oncancel?.();
	}

	async function handleConfirm() {
		await onconfirm();
		open = false;
	}
</script>

<Modal bind:open title={title} size="sm" onclose={handleCancel}>
	<div class="space-y-5">
		<p class="text-sm text-secondary">{message}</p>
		<div class="flex gap-3">
			<Button onclick={handleCancel} variant="ghost" fullWidth disabled={loading}>
				{#snippet children()}
					{cancelLabel}
				{/snippet}
			</Button>
			<Button
				onclick={handleConfirm}
				variant={danger ? 'danger' : 'primary'}
				fullWidth
				loading={loading}
				loadingLabel={confirmLabel}
			>
				{#snippet children()}
					{confirmLabel}
				{/snippet}
			</Button>
		</div>
	</div>
</Modal>
