<script>
    import { persist, retrieve } from "@utility/utils";
    import TextInput from "@components/TextInput.svelte";
    import Tooltip from "@components/Tooltip.svelte";
    import { Label, RadioGroup } from "bits-ui";
    import { onMount } from "svelte";
    import Checkbox from "@/components/Checkbox.svelte";

    const placeholder = `E.g.: "1{2} +1 -2" or "a b? a* g"`;

    let { onKeydown } = $props();
    let searchMode = $state(),
        patternInputBox = $state(),
        excludeHigherLiquescentCheckbox = $state(),
        excludeLowerLiquescentCheckbox = $state(),
        /** Global error message */ error = $state("");

    onMount(() => {
        searchMode = retrieve("search-mode") || "wildcard";
        persist("search-mode", searchMode);
    });

    /**
     * Takes in the raw input string, output a list of recognizable token
     * @param {string} inputStr the raw input string
     * @return {string[]}
     */
    function filterValidWildcardInput(inputStr) {
        /**
         * @type {RegExp} A filter for valid wildcard input
         * - As of version 0.5.9: /([A-Ga-g.]|(\+?-?\d))((\{(\d+\,)?\d+\})|([\?*]?))/gi
         */
        const wildcardInputFilter =
            /([A-Ga-g.]|(\+?-?\d))((\{(\d+\,)?\d+\})|([\?*]?))/gi;

        /**
         * @type {string[] | null} filteredInput
         * It contains the list of valid tokens all in string format.
         *
         * - For note heights (numerical values), they would need to be converted into a different format
         * for string matching.
         *   - Zero and positive numbers: `\+0`, `\+1`, `\+2`, `\+3`
         *   - Negative numbers: `-1`, `-2`, `-3`
         */
        let filteredInput = inputStr.match(wildcardInputFilter);
        if (filteredInput == null) {
            return [];
        }

        for (let i = 0; i < filteredInput.length; i++) {
            // If a token is a number with a +, -, or no sign
            // The value cannot be inside curly brackets as it is a quantifier
            filteredInput[i] = filteredInput[i].replace(
                /(?<!\{)(\+|\-|)\d(?!\})/,
                (match) => {
                    if (Number(match) >= 0) {
                        return `\(\\+${Number(match)}\)`;
                    } else {
                        return `\(${match}\)`;
                    }
                },
            );

            // If a token is a dot: the value can match anything including:
            // - A-G, a-g: square note pitch
            // - 0-9: Aquitanian note height
            // Note: \\ is important to create regex escape character
            filteredInput[i] = filteredInput[i].replace(
                /\./,
                `\([A-Ga-g]|(\\\+?-?\\d)\)`,
            );
        }
        return filteredInput;
    }

    /**
     * Takes in the raw input string, output a list of valid numerical values
     * @param {string} inputStr the raw input string
     * @return {number[]}
     */
    function filterValidContourInput(inputStr) {
        const numericInputFilter = /\+?\-?\d|[uds]/g;
        let melodyList = inputStr.match(numericInputFilter);

        if (melodyList != null) {
            return melodyList.map((item) => {
                return isNaN(item) ? item : Number(item);
            });
        } else {
            return [];
        }
    }

    /**
     * @param {string[]} inputCharList a list of valid characters
     * @return {RegExp} Regular Expression from the input token list (global, case insensitive)
     */
    function constructMatchingRegexp(inputCharList) {
        if (!inputCharList) {
            return new RegExp("");
        }

        try {
            let matchingRegex = new RegExp(inputCharList.join(""), "gi");
            error = "";
            return matchingRegex;
        } catch (e) {
            error = e;
        }
    }

    /**
     * @return {RegExp} regular expression
     */
    export function getWildcardRegex() {
        return constructMatchingRegexp(
            filterValidWildcardInput(patternInputBox.getValue()),
        );
    }

    export function getRegexError() {
        if (!error) {
            return null;
        }
        return new Error(error);
    }

    export function reset() {
        patternInputBox.setValue("");
        searchMode = "wildcard";
        persist("search-mode", searchMode);

        excludeHigherLiquescentCheckbox.setUnchecked();
        excludeLowerLiquescentCheckbox.setUnchecked();
    }

    export function getMelodicPatternSearchMode() {
        return retrieve("search-mode");
    }

    /**
     * @return {RegExp | Number[]}
     */
    export function getMelodicPatternInput() {
        if (searchMode == "wildcard") {
            return constructMatchingRegexp(
                filterValidWildcardInput(patternInputBox.getValue()),
            );
        } else if (searchMode == "contour") {
            // Contour pattern input does not need the RegExp construction step!
            return filterValidContourInput(patternInputBox.getValue());
        }
    }

    export function getLiquescentExclusion() {
        return {
            excludeHigher: excludeHigherLiquescentCheckbox.isChecked(),
            excludeLower: excludeLowerLiquescentCheckbox.isChecked(),
        };
    }

    // Styling classes
    const radioGroupRoot = "flex flex-col gap-2 text-base font-medium my-1",
        radioDiv =
            "group flex select-none items-center text-foreground transition-all",
        radioGroupItem =
            "size-5 shrink-0 cursor-default rounded-full border border-4 bg-white transition-all duration-150 ease-in-out hover:border-emerald-300 data-[state=checked]:border-emerald-800",
        labelRoot = "pl-2";
</script>

<p>
    Filter chants by
    <span class="melodic-pattern-word"> melodic pattern </span>
</p>

<RadioGroup.Root
    class={radioGroupRoot}
    value={searchMode}
    onValueChange={(newValue) => {
        searchMode = newValue;
        persist("search-mode", newValue);
    }}
>
    <div class={radioDiv}>
        <RadioGroup.Item id="wildcard" value="wildcard" class={radioGroupItem}
        ></RadioGroup.Item>
        <Label.Root for="wildcard" class={labelRoot}>
            Note pitches/Location (wildcards)
        </Label.Root>

        <Tooltip id="wildcard-tooltip">
            {#snippet title()}
                <h2>Wildcard tooltip</h2>
            {/snippet}
            {#snippet content()}
                <div>
                    <p>
                        The following rules applies to both <b
                            >square music script's pitches</b
                        >
                        (<code>A</code>/<code>a</code> to <code>G</code>/<code
                            >g</code
                        >,
                        <i>case insensitive</i>) and
                        <b>Aquitanian script's relative location to the line</b>
                        (e.g., <code>-1</code>, <code>0</code>, <code>+2</code>,
                        <code>+3</code>). Note that blank space between
                        characters and the plus sign "+" for positive integers
                        are <i> optional </i>.
                    </p>
                    <p>
                        The wildcards follow the conventional <i
                            >regular expression</i
                        > standard.
                    </p>
                    <hr />
                    <ul>
                        <li>
                            Use a dot <b><code>.</code></b> to search for one
                            arbitrary note. For example:
                            <ul>
                                <li>
                                    <code>d . a</code> will look for the
                                    following sequences of notes:
                                    <code>d f a</code>,
                                    <code> d a a</code>, <code> d c a</code>,
                                    etc.
                                </li>
                            </ul>
                        </li>
                        <li>
                            Use a question mark <code>?</code>
                            <b> after a note or a dot </b>
                            <code>.</code> to search for an optional note. For
                            example:
                            <ul>
                                <li>
                                    <code>f d? a</code> will look for the
                                    following sequences of notes:
                                    <code>f d a</code>, or
                                    <code>f a</code>.
                                </li>
                                <li>
                                    <code>-2 .? +1</code> will look for the
                                    following sequences of notes:
                                    <code>-2 +1</code>,
                                    <code>-2 +1 +1</code>,
                                    <code>-2 0 +1</code>, or
                                    <code>-2 -3 +1</code>, etc.
                                </li>
                            </ul>
                        </li>
                        <li>
                            Use an asterisk <code>*</code> <b> after a note </b>
                            to search for any number of repetition of that note (0
                            or more occurrences).
                            <br />
                            For example:
                            <ul>
                                <li>
                                    <code>f d* a</code> will look for the
                                    following sequences of notes:
                                    <code>f a</code>, or
                                    <code>f d a</code>, <code>f d d a</code>,
                                    <code>f d d d a</code>, etc.
                                </li>
                                <li>
                                    <code>f .* a</code> will look for the
                                    sequences starting with <code>f</code>
                                    and ending with <code>a</code>, with any
                                    number of notes in between.
                                </li>
                            </ul>
                        </li>
                        <li>
                            Use curly brackets and numerical value(s) <b>
                                after a note
                            </b>
                            to search for a specific number or range of repetitions
                            for that note.
                            <br />
                            For example:
                            <ul>
                                <li>
                                    Syntax: <code>{`c{2}`}</code>,
                                    <code>{`a{2,4}`}</code>,
                                    <code>{`+2{1,5}`}</code>, or
                                    <code> {`.{3}`} </code>
                                </li>
                                <li>
                                    <code> {`+2 +1{2} -1`} </code> would search
                                    for all occurences of
                                    <code> +2 +1 +1 -1 </code>
                                </li>
                                <li>
                                    <code> {`f c{1, 5} a`} </code> would search
                                    for all occurences of <code>f</code>,
                                    followed by
                                    <b>1 to 5</b>
                                    <code>c</code>, and ending with
                                    <code>a</code>.
                                </li>
                                <li>
                                    <code> {`-1 .{2,4} +3`} </code> would search
                                    for all occurences of <code>-1</code>,
                                    followed by
                                    <b>2 to 4</b>
                                    <i> arbitrary notes</i>, and ending with
                                    <code>+3</code>.
                                </li>
                            </ul>
                        </li>
                    </ul>
                </div>
            {/snippet}
        </Tooltip>
    </div>

    <div class={radioDiv}>
        <RadioGroup.Item id="contour" value="contour" class={radioGroupItem} />
        <Label.Root for="contour" class={labelRoot}>
            Contour (melodic intervals)
        </Label.Root>
        <Tooltip id="contour-tooltip">
            {#snippet title()}
                <h2>Contour tooltip</h2>
            {/snippet}
            {#snippet content()}
                <div>
                    <b> Contour (melodic intervals) </b> in the form of:
                    <ul>
                        <li>
                            <b> Positive or negative integers </b>, the integers
                            can be separated optionally by a space. For example:
                            <ul>
                                <li>
                                    <code>+1</code> or <code>1</code> indicates one step up - either
                                    a semitone or a tone - from the previous note
                                </li>
                                <li>
                                    <code>-2</code> indicates two steps down - either
                                    a major or minor third - from the previous note
                                </li>
                                <li>
                                    <code>0</code> indicates unison
                                </li>
                                <li>
                                    Example of a search query:
                                    <code>+2 -1 0 +1 +1</code> will search for patterns
                                    that go <i>two steps up, one step down, unison,
                                    two steps up, and one step up</i>.
                                </li>
                            </ul>
                        </li>
                        <li>
                            <b>General contour</b> (<i>case insensitive</i>,
                            optional spaces):
                            <ul>
                                <li>
                                    <code>u</code> for upward contour (ascending
                                    pitches)
                                </li>
                                <li>
                                    <code>d</code> for downward contour (decending
                                    pitches)
                                </li>
                                <li>
                                    <code>s</code> for the same note (unison)
                                </li>
                                <li>
                                    Example of a search query:
                                    <code>u d s u d</code> will search for a contour
                                    pattern that goes up, down, same, up, down.
                                </li>
                            </ul>
                        </li>
                        <li>
                            A mix of both integers and general contour is
                            allowed.
                            <ul>
                                <li>
                                    E.g., <code>u -2 0 +1</code> will search for
                                    a pattern that goes up, two steps down, unison,
                                    and one step up.
                                </li>
                            </ul>
                        </li>
                    </ul>
                </div>
            {/snippet}
        </Tooltip>
    </div>
</RadioGroup.Root>

<TextInput
    id="melodic-pattern-input"
    {onKeydown}
    {placeholder}
    bind:this={patternInputBox}
/>

<Checkbox value="excl-higher-liquescent" bind:this={excludeHigherLiquescentCheckbox}>
    <!-- Excluding results with ascending liquescences -->
    Excluding patterns with ascending liquescences
</Checkbox>

<Checkbox value="excl-lower-liquescent" bind:this={excludeLowerLiquescentCheckbox}>
    <!-- Excluding results with descending liquescences -->
    Excluding patterns with descending liquescences
</Checkbox>

{error}
