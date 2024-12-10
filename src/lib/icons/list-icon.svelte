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
		d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
	/>
</svg>
