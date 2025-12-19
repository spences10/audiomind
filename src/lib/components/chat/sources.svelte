<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Sheet from '$lib/components/ui/sheet';
	import { BookOpen, Clock, Mic } from '@lucide/svelte';

	interface SourceDocument {
		type: 'source-document';
		sourceId: string;
		mediaType: string;
		title: string;
		filename?: string;
	}

	let { sources }: { sources: SourceDocument[] } = $props();
</script>

{#if sources.length > 0}
	<Sheet.Root>
		<Sheet.Trigger>
			{#snippet child({ props })}
				<Button
					variant="ghost"
					size="sm"
					class="h-7 gap-1.5 text-xs text-muted-foreground"
					{...props}
				>
					<BookOpen class="h-3 w-3" />
					{sources.length} source{sources.length === 1 ? '' : 's'}
				</Button>
			{/snippet}
		</Sheet.Trigger>
		<Sheet.Content side="right" class="w-full sm:max-w-md">
			<Sheet.Header>
				<Sheet.Title>Sources</Sheet.Title>
				<Sheet.Description>
					Referenced podcast segments for this response
				</Sheet.Description>
			</Sheet.Header>
			<div class="mt-4 flex flex-1 flex-col gap-4 overflow-y-auto">
				{#each sources as source}
					<div class="rounded-lg border bg-card p-4">
						<div class="mb-2 flex items-start gap-2">
							<span
								class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
							>
								{source.sourceId}
							</span>
							<div class="min-w-0 flex-1">
								<div
									class="flex items-center gap-1.5 text-sm font-medium"
								>
									<Mic class="h-3 w-3 shrink-0" />
									<span class="truncate">{source.title}</span>
								</div>
								{#if source.filename}
									<div
										class="mt-1 flex items-center gap-1 text-xs text-muted-foreground"
									>
										<Clock class="h-3 w-3" />
										<span>{source.filename}</span>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</Sheet.Content>
	</Sheet.Root>
{/if}
