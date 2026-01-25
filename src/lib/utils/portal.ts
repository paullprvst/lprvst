import type { Action } from 'svelte/action';

export const portal: Action<HTMLElement, string | undefined> = (node, target = 'body') => {
	const targetEl = document.querySelector(target);
	if (targetEl) {
		targetEl.appendChild(node);
	}

	return {
		destroy() {
			node.remove();
		}
	};
};
