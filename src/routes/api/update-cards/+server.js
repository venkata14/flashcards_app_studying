import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
	const { missedIds, correctIds, filename } = await request.json();

	const filePath = join(process.cwd(), 'static', filename);

	const missedSet = new Set(missedIds);
	const correctSet = new Set(correctIds);

	const cards = JSON.parse(readFileSync(filePath, 'utf-8'));

	for (const card of cards) {
		if (missedSet.has(card.id)) {
			card.repeat = true;
		} else if (correctSet.has(card.id)) {
			card.repeat = false;
		}
	}

	writeFileSync(filePath, JSON.stringify(cards, null, 2), 'utf-8');

	return json({ ok: true });
}
