import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

const processor = unified()
	.use(remarkParse)
	.use(remarkMath)
	.use(remarkRehype)
	.use(rehypeKatex)
	.use(rehypeStringify);

export async function render(text) {
	const result = await processor.process(text);
	return String(result);
}

export async function renderCards(cards) {
	return Promise.all(
		cards.map(async (card) => ({
			...card,
			front: await render(card.front),
			back: await render(card.back)
		}))
	);
}
