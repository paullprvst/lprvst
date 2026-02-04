import { browser } from '$app/environment';
import { getAuthState, getAuthToken } from './auth-store.svelte';

export type Theme = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
	if (!browser) return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme {
	if (!browser) return 'system';
	return (localStorage.getItem('theme') as Theme) || 'system';
}

function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
	if (theme === 'system') {
		return getSystemTheme();
	}
	return theme;
}

class ThemeStore {
	theme = $state<Theme>(getStoredTheme());
	effectiveTheme = $derived<'light' | 'dark'>(getEffectiveTheme(this.theme));

	constructor() {
		if (browser) {
			// Listen for system theme changes
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			mediaQuery.addEventListener('change', () => {
				if (this.theme === 'system') {
					this.applyTheme();
				}
			});

			// Apply theme on initialization
			this.applyTheme();
		}
	}

	private applyTheme() {
		if (!browser) return;

		const effective = getEffectiveTheme(this.theme);
		document.documentElement.setAttribute('data-theme', effective);

		// Update meta theme-color for mobile browsers
		const metaThemeColor = document.querySelector('meta[name="theme-color"]');
		if (metaThemeColor) {
			metaThemeColor.setAttribute('content', effective === 'dark' ? '#111827' : '#ffffff');
		}
	}

	setTheme(theme: Theme) {
		this.theme = theme;

		if (browser) {
			if (theme === 'system') {
				localStorage.removeItem('theme');
			} else {
				localStorage.setItem('theme', theme);
			}
			this.applyTheme();

			// Save to server if authenticated (non-blocking)
			this.saveToServer(theme);
		}
	}

	toggle() {
		const newTheme = this.effectiveTheme === 'light' ? 'dark' : 'light';
		this.setTheme(newTheme);
	}

	// Load theme from server and apply if authenticated
	async syncFromServer() {
		if (!browser) return;

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

			if (!response.ok) return;

			const data = await response.json();
			const serverTheme = data.preferences?.theme as Theme | undefined;

			if (serverTheme && serverTheme !== this.theme) {
				// Server has a theme preference, apply it
				this.theme = serverTheme;
				if (serverTheme === 'system') {
					localStorage.removeItem('theme');
				} else {
					localStorage.setItem('theme', serverTheme);
				}
				this.applyTheme();
			} else if (!serverTheme && this.theme !== 'system') {
				// Server has no preference but we have a local one, sync it up
				this.saveToServer(this.theme);
			}
		} catch (err) {
			console.error('Failed to sync theme from server:', err);
		}
	}

	// Save theme to server (non-blocking)
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
