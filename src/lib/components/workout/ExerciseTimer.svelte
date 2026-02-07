<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { formatDuration } from '$lib/utils/date-helpers';
	import { Timer, SkipForward, Play } from 'lucide-svelte';
	import Button from '../shared/Button.svelte';

	interface Props {
		duration: number;
		setNumber: number;
		totalSets: number;
		onsetcomplete: () => void;
		onskip: () => void;
		autoStart?: boolean;
	}

	let { duration, setNumber, totalSets, onsetcomplete, onskip, autoStart = false }: Props = $props();

	let remaining = $state(0);
	let lastSecond = $state(0);
	let startTime = $state(0);
	let intervalId: number | null = null;
	let isRunning = $state(false);
	let isComplete = $state(false);
	let playedHalfway = $state(false);
	let playedCountdown = $state<Set<number>>(new Set());

	// Circle properties
	const radius = 90;
	const circumference = 2 * Math.PI * radius;

	const halfDuration = $derived(Math.floor(duration / 2));

	// Sound effects using Web Audio API for more control
	function playBeep(frequency: number, durationMs: number, volume: number = 0.3) {
		try {
			const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
			const oscillator = audioContext.createOscillator();
			const gainNode = audioContext.createGain();

			oscillator.connect(gainNode);
			gainNode.connect(audioContext.destination);

			oscillator.frequency.value = frequency;
			oscillator.type = 'sine';
			gainNode.gain.value = volume;

			oscillator.start();
			oscillator.stop(audioContext.currentTime + durationMs / 1000);
		} catch (e) {
			// Ignore audio errors
		}
	}

	function playHalfwayBeep() {
		// Two short beeps for halfway
		playBeep(880, 100, 0.2);
		setTimeout(() => playBeep(880, 100, 0.2), 150);
	}

	function playCountdownBeep() {
		// Short beep for countdown
		playBeep(660, 80, 0.25);
	}

	function playCompleteBeep() {
		// Longer, higher beep for completion
		playBeep(1320, 300, 0.3);
	}

	function start() {
		isRunning = true;
		remaining = duration;
		lastSecond = duration;
		startTime = Date.now();
		playedHalfway = false;
		playedCountdown = new Set();

		intervalId = window.setInterval(() => {
			const elapsed = Math.floor((Date.now() - startTime) / 1000);
			remaining = Math.max(0, duration - elapsed);

			// Check if we crossed into a new second
			if (remaining !== lastSecond) {
				lastSecond = remaining;

				// Halfway beep (only for durations > 6 seconds)
				if (duration > 6 && remaining === halfDuration && !playedHalfway) {
					playedHalfway = true;
					playHalfwayBeep();
				}

				// Countdown beeps at 3, 2, 1
				if (remaining >= 1 && remaining <= 3 && !playedCountdown.has(remaining)) {
					playedCountdown.add(remaining);
					playCountdownBeep();
				}
			}

			if (remaining === 0 && !isComplete) {
				isComplete = true;
				if (intervalId) clearInterval(intervalId);
				playCompleteBeep();
				onsetcomplete();
			}
		}, 100);
	}

	function skip() {
		if (intervalId) clearInterval(intervalId);
		onskip();
	}

	onMount(() => {
		remaining = duration;
		lastSecond = duration;
		if (autoStart) {
			start();
		}
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});

	const progress = $derived(isRunning ? (remaining / duration) * 100 : 100);
	const strokeDashoffset = $derived(circumference - (progress / 100) * circumference);

	// Color changes as timer progresses
	const timerColor = $derived(() => {
		if (!isRunning) return 'rgb(var(--color-primary))';
		if (progress > 50) return 'rgb(var(--color-primary))';
		if (progress > 20) return 'rgb(var(--color-warning))';
		return 'rgb(var(--color-error))';
	});
</script>

<div
	class="relative overflow-hidden surface rounded-2xl p-6 text-center space-y-6 border border-brand-soft shadow-lg animate-scaleIn"
>
	<!-- Dynamic color background based on timer progress -->
	<div
		class="absolute inset-0 pointer-events-none transition-colors duration-500"
		style="background-color: color-mix(in srgb, {timerColor()} 15%, transparent)"
	></div>

	<!-- Header -->
	<div class="relative flex items-center justify-center gap-2 text-brand">
		<Timer size={20} />
		<span class="text-sm font-bold uppercase tracking-wide">Set {setNumber} of {totalSets}</span>
	</div>

	<!-- Circular Progress Timer -->
	<div class="relative w-52 h-52 mx-auto z-10">
		<!-- Background circle -->
		<svg class="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
			<circle
				cx="100"
				cy="100"
				r={radius}
				fill="none"
				stroke="rgb(var(--color-border))"
				stroke-width="8"
			/>
			<!-- Progress circle -->
			<circle
				cx="100"
				cy="100"
				r={radius}
				fill="none"
				stroke={timerColor()}
				stroke-width="8"
				stroke-linecap="round"
				stroke-dasharray={circumference}
				stroke-dashoffset={strokeDashoffset}
				class="transition-all duration-200 ease-out"
			/>
		</svg>

		<!-- Timer display -->
		<div class="absolute inset-0 flex flex-col items-center justify-center">
			<span
				class="text-5xl font-bold transition-colors duration-200"
				style="color: {timerColor()}"
				class:animate-pulseScale={isRunning && remaining <= 5 && remaining > 0}
			>
				{formatDuration(remaining)}
			</span>
			<span class="text-sm text-muted mt-1">
				{#if isRunning}
					Time remaining
				{:else}
					Tap Start when ready
				{/if}
			</span>
		</div>
	</div>

	<!-- Buttons -->
	<div class="relative z-10 space-y-3">
		{#if !isRunning}
			<Button onclick={start} fullWidth={true}>
				{#snippet children()}
					<Play size={18} />
					Start Set
				{/snippet}
			</Button>
		{/if}
		<Button onclick={skip} variant="ghost" fullWidth={true}>
			{#snippet children()}
				<SkipForward size={18} />
				Skip Set
			{/snippet}
		</Button>
	</div>
</div>
