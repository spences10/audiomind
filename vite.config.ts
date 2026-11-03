import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite-plus';
import { playwright } from 'vite-plus/test/browser-playwright';

const ignore_patterns = [
	'.svelte-kit/**',
	'build/**',
	'coverage/**',
	'playwright-report/**',
	'test-results/**',
];

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter(),
			preprocess: vitePreprocess(),
			compilerOptions: { experimental: { async: true } },
			experimental: { remoteFunctions: true },
		}),
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				// Client-side tests (Svelte components)
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }],
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
				},
			},
			{
				// Server-side tests (Node.js utilities)
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
				},
			},
		],
	},
	fmt: {
		useTabs: true,
		singleQuote: true,
		printWidth: 70,
		trailingComma: 'all',
		proseWrap: 'always',
		svelte: true,
		sortTailwindcss: {
			stylesheet: './src/routes/layout.css',
		},
		ignorePatterns: [
			...ignore_patterns,
			'static/**',
			'package-lock.json',
			'pnpm-lock.yaml',
			'yarn.lock',
			'bun.lock',
			'bun.lockb',
			'.claude/settings.local.json',
		],
	},
	lint: {
		// shadcn-svelte components export types from <script module>,
		// which oxlint's type check can't read; svelte-check covers them
		ignorePatterns: [...ignore_patterns, 'src/lib/components/ui/**'],
		options: {
			typeAware: true,
			typeCheck: true,
		},
	},
});
