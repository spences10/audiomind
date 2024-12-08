import { LRUCache } from 'lru-cache';

// Cache for embeddings
const embedding_cache = new LRUCache<string, number[]>({
	max: 500, // Store up to 500 embeddings
	ttl: 1000 * 60 * 60 * 24, // 24 hour TTL
});

// Cache for search results
const search_results_cache = new LRUCache<string, any[]>({
	max: 100, // Store up to 100 search results
	ttl: 1000 * 60 * 60, // 1 hour TTL
});

// Cache for Claude responses
const claude_response_cache = new LRUCache<string, string>({
	max: 200, // Store up to 200 responses
	ttl: 1000 * 60 * 60 * 2, // 2 hour TTL
});

export function cache_embedding(
	text: string,
	embedding: number[],
): void {
	embedding_cache.set(text, embedding);
}

export function get_cached_embedding(
	text: string,
): number[] | undefined {
	return embedding_cache.get(text);
}

export function cache_search_results(
	query: string,
	results: any[],
): void {
	search_results_cache.set(query, results);
}

export function get_cached_search_results(
	query: string,
): any[] | undefined {
	return search_results_cache.get(query);
}

export function cache_claude_response(
	key: string,
	response: string,
): void {
	claude_response_cache.set(key, response);
}

export function get_cached_claude_response(
	key: string,
): string | undefined {
	return claude_response_cache.get(key);
}

// Generate a cache key for Claude responses based on query and context
export function generate_claude_cache_key(
	query: string,
	context: string[],
): string {
	const context_hash = context
		.sort()
		.join('')
		.split('')
		.reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
		.toString(36);
	return `${query}_${context_hash}`;
}
