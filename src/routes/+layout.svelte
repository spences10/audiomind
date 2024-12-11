<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<main class="min-h-screen bg-base-200">
	<div class="container prose prose-lg mx-auto max-w-4xl">
		{@render children()}
	</div>
</main>
