<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import {
		Sidebar,
		SidebarContent,
		SidebarFooter,
		SidebarGroup,
		SidebarGroupContent,
		SidebarGroupLabel,
		SidebarHeader,
		SidebarMenu,
		SidebarMenuButton,
		SidebarMenuItem,
	} from '$lib/components/ui/sidebar';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { ChatHistory } from '$lib/state/chat-history.svelte';
	import { MessageSquare, Plus, Trash2 } from '@lucide/svelte';
	import {
		isToday,
		isYesterday,
		subMonths,
		subWeeks,
	} from 'date-fns';
	import { toast } from 'svelte-sonner';

	const chatHistory = ChatHistory.fromContext();

	interface GroupedChats {
		today: typeof chatHistory.chats;
		yesterday: typeof chatHistory.chats;
		lastWeek: typeof chatHistory.chats;
		lastMonth: typeof chatHistory.chats;
		older: typeof chatHistory.chats;
	}

	const groupLabels = {
		today: 'Today',
		yesterday: 'Yesterday',
		lastWeek: 'Last 7 days',
		lastMonth: 'Last 30 days',
		older: 'Older',
	} as const;

	const groupedChats = $derived.by(() => {
		const now = new Date();
		const oneWeekAgo = subWeeks(now, 1);
		const oneMonthAgo = subMonths(now, 1);

		return chatHistory.chats.reduce(
			(groups, chat) => {
				const chatDate = new Date(chat.created_at);

				if (isToday(chatDate)) {
					groups.today.push(chat);
				} else if (isYesterday(chatDate)) {
					groups.yesterday.push(chat);
				} else if (chatDate > oneWeekAgo) {
					groups.lastWeek.push(chat);
				} else if (chatDate > oneMonthAgo) {
					groups.lastMonth.push(chat);
				} else {
					groups.older.push(chat);
				}

				return groups;
			},
			{
				today: [],
				yesterday: [],
				lastWeek: [],
				lastMonth: [],
				older: [],
			} as GroupedChats,
		);
	});

	async function handleDelete(id: string) {
		const success = await chatHistory.delete(id);
		if (success) {
			toast.success('Chat deleted');
			if (page.params.id === id) {
				goto('/');
			}
		} else {
			toast.error('Failed to delete chat');
		}
	}

	function handleNewChat() {
		goto('/');
	}
</script>

<Sidebar>
	<SidebarHeader>
		<div class="flex items-center justify-between px-2 py-2">
			<a href="/" class="text-lg font-semibold">AudioMind</a>
			<Button variant="ghost" size="icon" onclick={handleNewChat}>
				<Plus class="h-4 w-4" />
			</Button>
		</div>
	</SidebarHeader>

	<SidebarContent>
		{#if chatHistory.loading}
			<SidebarGroup>
				<SidebarGroupLabel>Today</SidebarGroupLabel>
				<SidebarGroupContent>
					<div class="space-y-2 px-2">
						{#each [44, 32, 28, 64, 52] as width}
							<Skeleton class="h-8" style="width: {width}%" />
						{/each}
					</div>
				</SidebarGroupContent>
			</SidebarGroup>
		{:else if chatHistory.chats.length === 0}
			<SidebarGroup>
				<SidebarGroupContent>
					<p class="px-4 py-2 text-sm text-muted-foreground">
						No chats yet. Start a conversation!
					</p>
				</SidebarGroupContent>
			</SidebarGroup>
		{:else}
			{#each Object.entries(groupedChats) as [group, chats]}
				{#if chats.length > 0}
					<SidebarGroup>
						<SidebarGroupLabel>
							{groupLabels[group as keyof typeof groupLabels]}
						</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{#each chats as chat (chat.id)}
									<SidebarMenuItem>
										<SidebarMenuButton
											class="group/item justify-between"
											isActive={page.params.id === chat.id}
										>
											<a
												href="/chat/{chat.id}"
												class="flex flex-1 items-center gap-2 truncate"
											>
												<MessageSquare class="h-4 w-4 shrink-0" />
												<span class="truncate">{chat.title}</span>
											</a>
											<button
												class="opacity-0 group-hover/item:opacity-100"
												onclick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													handleDelete(chat.id);
												}}
											>
												<Trash2
													class="h-4 w-4 text-muted-foreground hover:text-destructive"
												/>
											</button>
										</SidebarMenuButton>
									</SidebarMenuItem>
								{/each}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				{/if}
			{/each}
		{/if}
	</SidebarContent>

	<SidebarFooter>
		<p class="px-4 py-2 text-xs text-muted-foreground">
			Ask questions about your podcasts
		</p>
	</SidebarFooter>
</Sidebar>
