<script lang="ts">
	interface Props {
		height?: string;
		width?: string;
		class_names?: string;
		stroke_width?: string;
	}

	let {
		height = '24px',
		width = '24px',
		class_names,
		stroke_width = '1.5',
	}: Props = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	fill="none"
	viewBox="0 0 24 24"
	stroke-width={stroke_width}
	stroke="currentColor"
	class={class_names}
	{height}
	{width}
>
	<path
		stroke-linecap="round"
		stroke-linejoin="round"
		d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
	/>
</svg>
