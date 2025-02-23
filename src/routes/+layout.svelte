<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<main class="bg-base-200 min-h-screen">
	<div class="prose prose-lg container mx-auto max-w-4xl">
		{@render children()}
	</div>
</main>
