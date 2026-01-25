import { cubicOut, cubicIn, cubicInOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

interface FlyAndScaleParams {
	y?: number;
	x?: number;
	start?: number;
	duration?: number;
}

export function flyAndScale(
	node: Element,
	{ y = 8, x = 0, start = 0.95, duration = 200 }: FlyAndScaleParams = {}
): TransitionConfig {
	const style = getComputedStyle(node);
	const transform = style.transform === 'none' ? '' : style.transform;

	return {
		duration,
		css: (t) => {
			const eased = cubicOut(t);
			return `
				transform: ${transform} translate(${(1 - eased) * x}px, ${(1 - eased) * y}px) scale(${start + (1 - start) * eased});
				opacity: ${eased};
			`;
		}
	};
}

interface SlideUpParams {
	duration?: number;
	delay?: number;
}

export function slideUp(
	node: Element,
	{ duration = 300, delay = 0 }: SlideUpParams = {}
): TransitionConfig {
	return {
		duration,
		delay,
		css: (t) => {
			const eased = cubicOut(t);
			return `
				transform: translateY(${(1 - eased) * 16}px);
				opacity: ${eased};
			`;
		}
	};
}

interface ScaleInParams {
	duration?: number;
	start?: number;
}

export function scaleIn(
	node: Element,
	{ duration = 200, start = 0.95 }: ScaleInParams = {}
): TransitionConfig {
	return {
		duration,
		css: (t) => {
			const eased = cubicOut(t);
			return `
				transform: scale(${start + (1 - start) * eased});
				opacity: ${eased};
			`;
		}
	};
}

interface ModalTransitionParams {
	duration?: number;
}

export function modalIn(
	node: Element,
	{ duration = 300 }: ModalTransitionParams = {}
): TransitionConfig {
	return {
		duration,
		css: (t) => {
			const eased = cubicOut(t);
			return `
				transform: translateY(${(1 - eased) * 24}px) scale(${0.96 + 0.04 * eased});
				opacity: ${eased};
			`;
		}
	};
}

export function modalOut(
	node: Element,
	{ duration = 200 }: ModalTransitionParams = {}
): TransitionConfig {
	return {
		duration,
		css: (t) => {
			const eased = cubicIn(t);
			return `
				transform: translateY(${(1 - eased) * 24}px) scale(${0.96 + 0.04 * eased});
				opacity: ${eased};
			`;
		}
	};
}

interface StaggeredListParams {
	duration?: number;
	staggerDelay?: number;
	index?: number;
}

export function staggeredSlideUp(
	node: Element,
	{ duration = 300, staggerDelay = 50, index = 0 }: StaggeredListParams = {}
): TransitionConfig {
	return {
		duration,
		delay: index * staggerDelay,
		css: (t) => {
			const eased = cubicOut(t);
			return `
				transform: translateY(${(1 - eased) * 16}px);
				opacity: ${eased};
			`;
		}
	};
}

interface BackdropParams {
	duration?: number;
}

export function backdropIn(
	node: Element,
	{ duration = 200 }: BackdropParams = {}
): TransitionConfig {
	return {
		duration,
		css: (t) => `opacity: ${cubicOut(t)};`
	};
}

export function backdropOut(
	node: Element,
	{ duration = 150 }: BackdropParams = {}
): TransitionConfig {
	return {
		duration,
		css: (t) => `opacity: ${cubicIn(t)};`
	};
}

interface DrawParams {
	delay?: number;
	speed?: number;
	duration?: number;
	easing?: (t: number) => number;
}

export function draw(node: SVGElement & { getTotalLength(): number }, params: DrawParams = {}): TransitionConfig {
	const len = node.getTotalLength();
	const { delay = 0, speed = 1, duration = len / speed, easing = cubicInOut } = params;

	return {
		delay,
		duration,
		easing,
		css: (t) => `
			stroke-dasharray: ${len};
			stroke-dashoffset: ${len * (1 - t)};
		`
	};
}

interface CircularProgressParams {
	duration?: number;
	from?: number;
	to?: number;
}

export function circularProgress(
	node: SVGElement,
	{ duration = 1000, from = 0, to = 100 }: CircularProgressParams = {}
): TransitionConfig {
	const circumference = 283; // 2 * PI * 45 (radius)
	const startOffset = circumference - (from / 100) * circumference;
	const endOffset = circumference - (to / 100) * circumference;

	return {
		duration,
		css: (t) => {
			const eased = cubicOut(t);
			const offset = startOffset + (endOffset - startOffset) * eased;
			return `stroke-dashoffset: ${offset};`;
		}
	};
}
