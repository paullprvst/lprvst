function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function renderInlineMarkdown(text: string): string {
	let output = escapeHtml(text);

	// Inline code first so markdown markers inside code are not re-processed.
	output = output.replace(
		/`([^`]+)`/g,
		'<code class="rounded-md bg-[rgb(2_10_18/0.45)] px-1.5 py-0.5 font-mono text-[0.8rem]">$1</code>'
	);
	output = output.replace(
		/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
		'<a class="underline decoration-[rgb(var(--color-primary)/0.6)] underline-offset-2 hover:text-brand" href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
	);
	output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	output = output.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
	output = output.replace(/~~([^~]+)~~/g, '<del>$1</del>');
	return output;
}

function renderCodeBlock(lines: string[], language: string): string {
	const code = escapeHtml(lines.join('\n'));
	const label = language
		? `<div class="mb-2 text-[0.68rem] uppercase tracking-[0.08em] text-secondary">${escapeHtml(language)}</div>`
		: '';
	return `<div class="my-3 rounded-xl border border-theme bg-[rgb(2_10_18/0.42)] p-3 sm:p-3.5">${label}<pre class="overflow-x-auto"><code class="font-mono text-[0.78rem] leading-relaxed">${code}</code></pre></div>`;
}

function renderList(
	lines: string[],
	ordered: boolean
): { html: string; consumed: number } {
	const items: string[] = [];
	let consumed = 0;
	const matcher = ordered ? /^(\d+)\.\s+(.+)$/ : /^[-*+]\s+(.+)$/;

	while (consumed < lines.length) {
		const line = lines[consumed];
		const match = line.match(matcher);
		if (!match) break;
		const content = ordered ? match[2] : match[1];
		items.push(`<li>${renderInlineMarkdown(content.trim())}</li>`);
		consumed += 1;
	}

	const tag = ordered ? 'ol' : 'ul';
	const listClass = ordered
		? 'my-2 list-decimal space-y-1 pl-6'
		: 'my-2 list-disc space-y-1 pl-6';
	return {
		html: `<${tag} class="${listClass}">${items.join('')}</${tag}>`,
		consumed
	};
}

export function renderMarkdownToHtml(markdown: string): string {
	if (!markdown.trim()) return '';
	const lines = markdown.replace(/\r\n/g, '\n').split('\n');
	const blocks: string[] = [];
	let index = 0;

	while (index < lines.length) {
		const currentLine = lines[index] ?? '';
		const trimmed = currentLine.trim();

		if (!trimmed) {
			index += 1;
			continue;
		}

		const codeFence = currentLine.match(/^```(\S+)?\s*$/);
		if (codeFence) {
			const language = codeFence[1] ?? '';
			const codeLines: string[] = [];
			index += 1;
			while (index < lines.length && !/^```/.test(lines[index] ?? '')) {
				codeLines.push(lines[index] ?? '');
				index += 1;
			}
			if (index < lines.length && /^```/.test(lines[index] ?? '')) {
				index += 1;
			}
			blocks.push(renderCodeBlock(codeLines, language));
			continue;
		}

		const headingMatch = currentLine.match(/^(#{1,3})\s+(.+)$/);
		if (headingMatch) {
			const level = headingMatch[1].length + 2; // map h1-h3 to h3-h5 for bubble scale
			const headingText = renderInlineMarkdown(headingMatch[2].trim());
			blocks.push(
				`<h${level} class="mt-3 mb-1.5 text-sm sm:text-base font-semibold">${headingText}</h${level}>`
			);
			index += 1;
			continue;
		}

		if (/^[-*+]\s+/.test(currentLine)) {
			const { html, consumed } = renderList(lines.slice(index), false);
			blocks.push(html);
			index += consumed;
			continue;
		}

		if (/^\d+\.\s+/.test(currentLine)) {
			const { html, consumed } = renderList(lines.slice(index), true);
			blocks.push(html);
			index += consumed;
			continue;
		}

		const paragraphLines: string[] = [trimmed];
		index += 1;
		while (index < lines.length) {
			const line = lines[index] ?? '';
			if (!line.trim()) break;
			if (/^(#{1,3})\s+/.test(line)) break;
			if (/^```/.test(line)) break;
			if (/^[-*+]\s+/.test(line)) break;
			if (/^\d+\.\s+/.test(line)) break;
			paragraphLines.push(line.trim());
			index += 1;
		}
		blocks.push(`<p class="my-2">${renderInlineMarkdown(paragraphLines.join(' '))}</p>`);
	}

	return blocks.join('');
}
