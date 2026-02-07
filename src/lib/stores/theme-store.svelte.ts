import { browser } from '$app/environment';
import { getAuthState, getAuthToken } from './auth-store.svelte';

export type Theme = 'dark';

class ThemeStore {
	theme = $state<Theme>('dark');
	effectiveTheme = $derived<'dark'>('dark');

	constructor() {
		if (browser) {
			this.applyTheme();
		}
	}

	private applyTheme() {
		if (!browser) return;

		document.documentElement.setAttribute('data-theme', 'dark');
		document.documentElement.classList.add('dark');

		const metaThemeColor = document.querySelector('meta[name="theme-color"]');
		if (metaThemeColor) {
			metaThemeColor.setAttribute('content', '#0f0f14');
		}
	}

	setTheme(_theme: Theme = 'dark') {
		this.theme = 'dark';

		if (browser) {
			localStorage.setItem('theme', 'dark');
			this.applyTheme();
			this.saveToServer('dark');
		}
	}

	toggle() {
		this.setTheme('dark');
	}

	async syncFromServer() {
		if (!browser) return;

		this.theme = 'dark';
		this.applyTheme();

		const auth = getAuthState();
		if (!auth.isAuthenticated) return;

		try {
			const token = await getAuthToken();
			if (!token) return;

			const response = await fetch('/api/user/preferences', {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (!response.ok) {
				this.saveToServer('dark');
				return;
			}

			const data = await response.json();
			const serverTheme = data.preferences?.theme;

			if (serverTheme !== 'dark') {
				this.saveToServer('dark');
			}
		} catch (err) {
			console.error('Failed to sync theme from server:', err);
		}
	}

	private async saveToServer(theme: Theme) {
		const auth = getAuthState();
		if (!auth.isAuthenticated) return;

		try {
			const token = await getAuthToken();
			if (!token) return;

			await fetch('/api/user/preferences', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ theme })
			});
		} catch (err) {
			console.error('Failed to save theme to server:', err);
		}
	}
}

export const themeStore = new ThemeStore();
