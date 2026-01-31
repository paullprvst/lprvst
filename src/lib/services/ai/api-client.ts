import { getAuthToken } from '$lib/stores/auth-store.svelte';

async function getHeaders(): Promise<HeadersInit> {
	const token = await getAuthToken();
	const headers: HeadersInit = {
		'Content-Type': 'application/json'
	};
	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}
	return headers;
}

export async function postJSON<T>(url: string, body: unknown): Promise<T> {
	const response = await fetch(url, {
		method: 'POST',
		headers: await getHeaders(),
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ error: 'Request failed' }));
		throw new Error(error.error || `HTTP ${response.status}`);
	}

	return response.json();
}

export async function postStream(
	url: string,
	body: unknown,
	onChunk: (text: string) => void
): Promise<void> {
	const response = await fetch(url, {
		method: 'POST',
		headers: await getHeaders(),
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ error: 'Request failed' }));
		throw new Error(error.error || `HTTP ${response.status}`);
	}

	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error('No response body');
	}

	const decoder = new TextDecoder();
	let buffer = '';

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		buffer += decoder.decode(value, { stream: true });

		// Process complete SSE events
		const lines = buffer.split('\n');
		buffer = lines.pop() || ''; // Keep incomplete line in buffer

		for (const line of lines) {
			if (line.startsWith('data: ')) {
				const data = line.slice(6);
				if (data === '[DONE]') {
					return;
				}
				try {
					const parsed = JSON.parse(data);
					if (parsed.text) {
						onChunk(parsed.text);
					}
					if (parsed.error) {
						throw new Error(parsed.error);
					}
				} catch {
					// Skip malformed JSON
				}
			}
		}
	}
}
