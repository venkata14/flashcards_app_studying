export async function load({ fetch }) {
	const res = await fetch('/api/card-files');
	const files = await res.json();
	return { files };
}
