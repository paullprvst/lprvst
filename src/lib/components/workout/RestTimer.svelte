<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { formatDuration } from '$lib/utils/date-helpers';
	import { Clock } from 'lucide-svelte';

	interface Props {
		duration: number;
		oncomplete: () => void;
	}

	let { duration, oncomplete }: Props = $props();

	let remaining = $state(0);
	let startTime = $state(0);
	let intervalId: number | null = null;

	onMount(() => {
		remaining = duration;
		startTime = Date.now();
		intervalId = window.setInterval(() => {
			const elapsed = Math.floor((Date.now() - startTime) / 1000);
			remaining = Math.max(0, duration - elapsed);

			if (remaining === 0) {
				if (intervalId) clearInterval(intervalId);
				// Play beep sound
				try {
					const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGmi78OeeSwkNUKXi7rdlHQU5k9jyzH0tBSh+zPLaizsKGGO66+mhUQ0MUKXi7rdlHQU5k9jyzH0tBSh+zPLaizsKGGO66+mgUQ0MUKTi7rZlHQU5k9jyzH0tBSh+zPLaizsKGGO66+mgUQ0MUKTi7rZlHQU5k9jyzH0tBSh+zPLaizsKGGO66+mgUQ0MUKTi7rZlHQU5k9jyzH0tBSh+zPLaizsKGGO66+mgUQ0MUKTi7rZlHQU5k9jyzH0tBSh+zPLaizsKGGO66+mgUQ0MUKTi7rZlHQU5k9jyzH0tBSh+zPLaizsKGGO66+mgUQ0MUKTi7rZlHQU5k9jyzH0tBSh+');
					audio.play();
				} catch (e) {
					// Ignore audio errors
				}
				oncomplete();
			}
		}, 100);
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});

	const progress = $derived((remaining / duration) * 100);
</script>

<div class="bg-blue-50 rounded-lg p-6 text-center space-y-4">
	<div class="flex items-center justify-center gap-2 text-blue-600">
		<Clock size={24} />
		<span class="text-sm font-medium uppercase">Rest Timer</span>
	</div>

	<div class="text-5xl font-bold text-blue-600">
		{formatDuration(remaining)}
	</div>

	<div class="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
		<div
			class="bg-blue-600 h-full transition-all duration-100"
			style="width: {progress}%"
		></div>
	</div>

	<p class="text-sm text-gray-600">Rest time remaining</p>
</div>
