import { readdirSync } from 'fs';
import { join } from 'path';
import { json } from '@sveltejs/kit';

export async function GET() {
	const dir = join(process.cwd(), 'static');
	const files = readdirSync(dir)
		.filter((f) => f.endsWith('.json'))
		.sort();
	return json(files);
}
