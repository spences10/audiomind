<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import {
		SidebarInset,
		SidebarProvider,
	} from '$lib/components/ui/sidebar';
	import { ChatHistory } from '$lib/state/chat-history.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import { onMount } from 'svelte';
	import { Toaster } from 'svelte-sonner';
	import './layout.css';

	let { children } = $props();

	const chat_history = new ChatHistory();
	ChatHistory.setContext(chat_history);

	onMount(() => {
		chat_history.fetch();
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<ModeWatcher />
<Toaster />

<SidebarProvider open={false}>
	<AppSidebar />
	<SidebarInset>
		{@render children()}
	</SidebarInset>
</SidebarProvider>
