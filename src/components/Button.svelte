<script>
    /**
     * @typedef {Object} Props
     * @property {String} [id]
     * @property {function} [onClick]
     * @property {boolean} [disabled]
     * @property {String} [class]
     * @property {import('svelte').Snippet} [children]
     */

    /** @type {Props} */
    let {
        id = "button-id",
        onClick = null,
        disabled = false,
        class: className = "",
        children,
    } = $props();

    const defaultDisplay = "border-0 rounded-lg text-white py-2 px-4 font-medium bg-emerald-800 cursor-pointer transition ease-in-out duration-300 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed";

    let button = $state();
    export function click() {
        button.click();
    }
</script>

<button {id} onclick={onClick} bind:this={button} {disabled} class="{defaultDisplay} {className}">
    {@render children?.()}
</button>