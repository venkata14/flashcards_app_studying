<script>
	import { renderCards } from '$lib/render.js';

	let { data } = $props();

	// ── Utilities ──────────────────────────────────────────────────────────────

	function shuffle(arr) {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	function buildDeck(cards) {
		const repeats = cards.filter((c) => c.repeat);
		const rest = cards.filter((c) => !c.repeat);
		return [...shuffle(repeats), ...shuffle(rest)];
	}

	function displayName(filename) {
		return filename.replace(/\.json$/i, '').replace(/[-_]/g, ' ');
	}

	// ── Session state ──────────────────────────────────────────────────────────

	let phase = $state('selecting'); // 'selecting' | 'studying' | 'results'
	let loading = $state(false);

	let activeFile = $state('');
	let allCards = $state([]);
	let deck = $state([]);
	let currentIndex = $state(0);
	let flipped = $state(false);
	let correct = $state(0);
	let missed = $state([]);

	// ── Derived ────────────────────────────────────────────────────────────────

	let card = $derived(deck[currentIndex]);
	let total = $derived(deck.length);
	let remaining = $derived(total - currentIndex);
	let progressPct = $derived(Math.round((currentIndex / total) * 100));

	// ── Actions ────────────────────────────────────────────────────────────────

	async function selectFile(filename) {
		loading = true;
		const res = await fetch(`/${filename}`);
		const raw = await res.json();
		const rendered = await renderCards(raw);
		loading = false;

		activeFile = filename;
		allCards = rendered;
		deck = buildDeck(rendered);
		currentIndex = 0;
		flipped = false;
		correct = 0;
		missed = [];
		phase = 'studying';
	}

	function flipCard() {
		if (!flipped) flipped = true;
	}

	function advance(gotIt) {
		const finalMissed = gotIt ? missed : [...missed, deck[currentIndex]];

		if (gotIt) {
			correct++;
		} else {
			missed = finalMissed;
		}

		if (currentIndex + 1 >= total) {
			const missedIds = finalMissed.map((c) => c.id);
			const correctIds = deck.filter((c) => !missedIds.includes(c.id)).map((c) => c.id);

			fetch('/api/update-cards', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ missedIds, correctIds, filename: activeFile })
			});

			phase = 'results';
		} else {
			currentIndex++;
			flipped = false;
		}
	}

	function restart() {
		deck = buildDeck(allCards);
		currentIndex = 0;
		flipped = false;
		correct = 0;
		missed = [];
		phase = 'studying';
	}

	function retryMissed() {
		deck = shuffle([...missed]);
		currentIndex = 0;
		flipped = false;
		correct = 0;
		missed = [];
		phase = 'studying';
	}

	function chooseDeck() {
		phase = 'selecting';
	}

	// ── Keyboard shortcuts ─────────────────────────────────────────────────────

	function handleKeydown(e) {
		if (phase !== 'studying') return;
		if (e.target.tagName === 'BUTTON') return;

		if (e.key === ' ') {
			e.preventDefault();
			flipCard();
		} else if (e.key === '1' && flipped) {
			advance(false);
		} else if (e.key === '2' && flipped) {
			advance(true);
		}
	}
</script>

<svelte:head>
	<title>Flashcards</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">

	<!-- ── Header ──────────────────────────────────────────────────────────── -->
	<header class="px-6 pt-6 pb-4 max-w-2xl w-full mx-auto">
		<h1 class="text-2xl font-bold tracking-tight text-zinc-100 mb-1">Flashcards</h1>
		{#if phase === 'studying'}
			<p class="text-sm text-zinc-500">
				Card <span class="text-zinc-300 font-medium">{currentIndex + 1}</span> of
				<span class="text-zinc-300 font-medium">{total}</span>
				&nbsp;·&nbsp;
				<span class="text-indigo-400 font-medium">{card.topic}</span>
				&nbsp;·&nbsp;
				<button onclick={chooseDeck} class="text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2 text-xs">
					{displayName(activeFile)}
				</button>
			</p>
		{/if}
	</header>

	<!-- ══════════════════════════════════════════════════════════════════════ -->
	{#if phase === 'selecting'}

		<main class="flex-1 flex flex-col items-center justify-center px-6 max-w-2xl w-full mx-auto gap-6">

			{#if loading}
				<p class="text-zinc-500 text-sm animate-pulse">Loading cards…</p>
			{:else}
				<div class="text-center">
					<p class="text-zinc-400">Choose a deck to study</p>
				</div>

				<div class="w-full flex flex-col gap-3">
					{#each data.files as filename}
						<button
							onclick={() => selectFile(filename)}
							class="w-full text-left px-5 py-4 rounded-xl bg-zinc-800 border border-zinc-700 hover:border-indigo-500 hover:bg-zinc-700 active:scale-[0.98] transition-all duration-150 group"
						>
							<span class="block text-base font-semibold text-zinc-100 capitalize group-hover:text-indigo-300 transition-colors">
								{displayName(filename)}
							</span>
							<span class="block text-xs text-zinc-500 mt-0.5">{filename}</span>
						</button>
					{/each}

					{#if data.files.length === 0}
						<p class="text-zinc-600 text-sm text-center">No JSON files found in <code class="text-zinc-500">static/</code></p>
					{/if}
				</div>
			{/if}

		</main>

	<!-- ══════════════════════════════════════════════════════════════════════ -->
	{:else if phase === 'studying'}

		<!-- ── Progress bar ──────────────────────────────────────────────────── -->
		<div class="px-6 max-w-2xl w-full mx-auto mb-5">
			<div class="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
				<div
					class="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500"
					style="width: {progressPct}%"
				></div>
			</div>
		</div>

		<!-- ── Stats strip ───────────────────────────────────────────────────── -->
		<div class="px-6 max-w-2xl w-full mx-auto mb-6 flex gap-4">
			<div class="flex items-center gap-1.5 text-sm">
				<span class="w-2 h-2 rounded-full bg-zinc-500 inline-block"></span>
				<span class="text-zinc-400">Remaining <span class="text-zinc-200 font-semibold">{remaining}</span></span>
			</div>
			<div class="flex items-center gap-1.5 text-sm">
				<span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
				<span class="text-zinc-400">Correct <span class="text-emerald-400 font-semibold">{correct}</span></span>
			</div>
			<div class="flex items-center gap-1.5 text-sm">
				<span class="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
				<span class="text-zinc-400">Missed <span class="text-rose-400 font-semibold">{missed.length}</span></span>
			</div>
		</div>

		<!-- ── Card ──────────────────────────────────────────────────────────── -->
		<main class="flex-1 flex flex-col items-center px-6 max-w-2xl w-full mx-auto">

			<div
				class="perspective-1000 w-full cursor-pointer select-none mb-6"
				onclick={flipCard}
				role="button"
				tabindex="0"
				onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') flipCard(); }}
				aria-label="Click to flip card"
			>
				<div
					class="transform-style-3d card-inner w-full transition-transform duration-500"
					style="transform: {flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'};"
				>
					<!-- Front face -->
					<div class="backface-hidden card-face flex flex-col">
						<div class="bg-zinc-800 border border-zinc-700 rounded-2xl p-8 flex flex-col items-center justify-center shadow-xl min-h-[260px]">
							<span class="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">Question</span>
							<div class="card-content text-lg font-medium text-center text-zinc-100 leading-relaxed">{@html card.front}</div>
							<p class="mt-6 text-xs text-zinc-600">Tap or press <kbd class="px-1 py-0.5 rounded bg-zinc-700 text-zinc-400 font-mono text-xs">Space</kbd> to reveal</p>
						</div>
					</div>

					<!-- Back face -->
					<div class="backface-hidden rotate-y-180 card-face flex flex-col">
						<div class="bg-zinc-800 border border-emerald-800/40 rounded-2xl p-8 flex flex-col items-center justify-center shadow-xl gap-4 min-h-[260px]">
							<div class="w-full text-center border-b border-zinc-700 pb-4">
								<span class="text-xs font-semibold uppercase tracking-widest text-zinc-500">Question</span>
								<div class="card-content mt-1.5 text-sm text-zinc-400 leading-relaxed">{@html card.front}</div>
							</div>
							<span class="text-xs font-semibold uppercase tracking-widest text-emerald-400">Answer</span>
							<div class="card-content text-base text-center text-zinc-200 leading-relaxed">{@html card.back}</div>
						</div>
					</div>
				</div>
			</div>

			<!-- ── Action buttons ─────────────────────────────────────────────── -->
			{#if flipped}
				<div class="flex gap-4 w-full">
					<button
						onclick={() => advance(false)}
						class="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 transition-all duration-150 font-semibold text-white shadow-lg shadow-rose-900/40"
					>
						<kbd class="text-xs font-mono bg-rose-800/60 px-1 py-0.5 rounded">1</kbd>
						<span class="text-lg">✗</span> Missed it
					</button>
					<button
						onclick={() => advance(true)}
						class="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all duration-150 font-semibold text-white shadow-lg shadow-emerald-900/40"
					>
						<kbd class="text-xs font-mono bg-emerald-800/60 px-1 py-0.5 rounded">2</kbd>
						<span class="text-lg">✓</span> Got it
					</button>
				</div>
			{:else}
				<div class="h-[54px]"></div>
			{/if}

		</main>

	<!-- ══════════════════════════════════════════════════════════════════════ -->
	{:else}

		<!-- ── Results screen ─────────────────────────────────────────────────── -->
		<main class="flex-1 flex flex-col items-center justify-center px-6 max-w-2xl w-full mx-auto text-center gap-6">

			<div class="text-6xl">
				{#if correct === total}🎉{:else if correct / total >= 0.7}👍{:else}📚{/if}
			</div>

			<div>
				<h2 class="text-3xl font-bold text-zinc-100 mb-1">Session Complete</h2>
				<p class="text-zinc-500 text-sm">Here's how you did</p>
			</div>

			<div class="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
				<div class="text-center">
					<span class="text-5xl font-black text-indigo-400">{correct}</span>
					<span class="text-2xl font-bold text-zinc-500"> / {total}</span>
					<p class="text-sm text-zinc-500 mt-1">cards correct</p>
				</div>
				<hr class="border-zinc-700" />
				<div class="flex justify-around text-center">
					<div>
						<p class="text-2xl font-bold text-emerald-400">{correct}</p>
						<p class="text-xs text-zinc-500 mt-0.5">Got it</p>
					</div>
					<div class="w-px bg-zinc-700"></div>
					<div>
						<p class="text-2xl font-bold text-rose-400">{missed.length}</p>
						<p class="text-xs text-zinc-500 mt-0.5">Missed</p>
					</div>
					<div class="w-px bg-zinc-700"></div>
					<div>
						<p class="text-2xl font-bold text-zinc-300">{Math.round((correct / total) * 100)}%</p>
						<p class="text-xs text-zinc-500 mt-0.5">Score</p>
					</div>
				</div>
			</div>

			<div class="flex flex-col gap-3 w-full">
				{#if missed.length > 0}
					<button
						onclick={retryMissed}
						class="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all duration-150 font-semibold text-white shadow-lg shadow-indigo-900/40"
					>
						Retry missed cards ({missed.length})
					</button>
				{/if}
				<button
					onclick={restart}
					class="w-full py-3.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 active:scale-95 transition-all duration-150 font-semibold text-zinc-200"
				>
					Restart with all cards
				</button>
				<button
					onclick={chooseDeck}
					class="w-full py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 active:scale-95 transition-all duration-150 font-semibold text-zinc-400"
				>
					Choose a different deck
				</button>
			</div>

		</main>

	{/if}

	<footer class="py-6 text-center text-xs text-zinc-700">
		{#if phase === 'selecting'}
			{data.files.length} deck{data.files.length !== 1 ? 's' : ''} available
		{:else}
			{allCards.length} cards · {displayName(activeFile)}
		{/if}
	</footer>
</div>
