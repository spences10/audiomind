<script lang="ts">
	import type { ActionData } from './$types';

	const form = $props<{ form: ActionData }>();
	let search_query = $state('');
</script>

<main class="min-h-screen bg-base-200 p-4">
	<div class="container mx-auto max-w-4xl">
		<header>
			<h1 class="mb-8 text-center text-4xl font-bold text-primary">
				Grumpy SEO Guy Podcast Chat
			</h1>
		</header>

		<section
			class="card bg-base-100 shadow-xl"
			aria-labelledby="search-title"
		>
			<div class="card-body">
				<h2 id="search-title" class="card-title text-secondary">
					Search Episodes
				</h2>
				<form class="space-y-4" method="POST" action="?/search">
					<div class="join w-full">
						<label for="search-query" class="sr-only"
							>Search query</label
						>
						<input
							type="search"
							id="search-query"
							name="query"
							bind:value={search_query}
							class="input join-item input-bordered input-primary flex-1"
							placeholder="Enter search query"
						/>
						<button type="submit" class="btn btn-primary join-item">
							Search
						</button>
					</div>

					{#if form.form?.error}
						<div class="alert alert-error shadow-lg" role="alert">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
								/></svg
							>
							<span>{form.form.error}</span>
						</div>
					{/if}

					{#if form.form?.success}
						<div class="space-y-4">
							{#if form.form.claude_response}
								<article
									class="alert alert-info shadow-lg"
									role="alert"
								>
									<div>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											class="h-6 w-6 flex-shrink-0 stroke-current"
											aria-hidden="true"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
											></path></svg
										>
										<div>
											<h3 class="font-bold text-primary">
												Claude's Response:
											</h3>
											<div class="prose max-w-none">
												{form.form.claude_response}
											</div>
										</div>
									</div>
								</article>
							{/if}

							<div
								class="divider font-medium text-primary"
								role="separator"
							>
								Search Results
							</div>

							<div
								class="space-y-4"
								role="feed"
								aria-label="Search results"
							>
								{#each form.form.results as result}
									<article
										class="card bg-base-200 shadow-sm transition-shadow hover:shadow-md"
									>
										<div class="card-body">
											<h4 class="card-title text-base text-primary">
												{result.episode}
											</h4>
											<div
												class="badge badge-secondary text-base-100"
											>
												Similarity: {(
													result.similarity * 100
												).toFixed(1)}%
											</div>
											<p class="mt-2">{result.text}</p>
										</div>
									</article>
								{/each}
							</div>
						</div>
					{/if}
				</form>
			</div>
		</section>
	</div>
</main>
