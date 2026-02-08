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

export async function checkApiKeyStatus(): Promise<boolean> {
	const response = await fetch('/api/user/api-key', {
		method: 'GET',
		headers: await getHeaders()
	});

	if (!response.ok) {
		return false;
	}

	const data = await response.json();
	return data.hasApiKey;
}

export async function saveApiKey(apiKey: string): Promise<boolean> {
	const response = await fetch('/api/user/api-key', {
		method: 'POST',
		headers: await getHeaders(),
		body: JSON.stringify({ apiKey })
	});

	if (!response.ok) {
		return false;
	}

	const data = await response.json();
	return data.success;
}

export async function postJSON<T>(url: string, body: Record<string, unknown>): Promise<T> {
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

export interface StreamEvent {
	type?: 'status' | 'text' | 'action' | 'error' | 'done';
	text?: string;
	step?: string;
	action?: unknown;
	error?: string;
}

export async function postEventStream(
	url: string,
	body: Record<string, unknown>,
	onEvent: (event: StreamEvent) => void
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

		const lines = buffer.split('\n');
		buffer = lines.pop() || '';

		for (const line of lines) {
			if (!line.startsWith('data: ')) continue;
			const data = line.slice(6);
			if (data === '[DONE]') {
				onEvent({ type: 'done' });
				return;
			}

			const parsed = JSON.parse(data) as StreamEvent;
			if (parsed.error) {
				throw new Error(parsed.error);
			}
			onEvent(parsed);
		}
	}
}

export async function postStream(
	url: string,
	body: Record<string, unknown>,
	onChunk: (text: string) => void
): Promise<void> {
	await postEventStream(url, body, (event) => {
		if (event.text) {
			onChunk(event.text);
		}
	});
}
