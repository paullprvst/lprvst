import { browser } from '$app/environment';

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
		}
	}

	toggle() {
		const newTheme = this.effectiveTheme === 'light' ? 'dark' : 'light';
		this.setTheme(newTheme);
	}
}

export const themeStore = new ThemeStore();
