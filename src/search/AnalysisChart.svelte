<script>
  /**
   * The chart analysis produces a chart that analyse an input chant
   */
  import {
    Chant,
    septenaryToPitchOctave,
    toSeptenary,
    getNeumeComponentList,
    NeumeComponent,
  } from "@utility/components";
  import { Chart } from "chart.js/auto";
  import { onMount } from "svelte";

  /**
   * @typedef {Object} Props
   * @property {Chant} chant
   */

  /** @type {Props} */
  let { chant } = $props();

  // The place for the chart
  /** @type {Chart} */
  let chart = $state();

  // Colours
  const COLORS = {
    normalBg: "#10b98180",
    normalBorder: "#047857aa",
    rhombusBg: "#67e8f980",
    rhombusBorder: "#06b6d4aa",
  };

  /**
   * Take the Aquitanian neume component list, output useable chant data for the chart
   *
   * @param {NeumeComponent[]} chantNC
   */
  function getChantDataAquitanian(chantNC) {
    // Find ambitus range in a single pass
    let minLoc = Infinity;
    let maxLoc = -Infinity;

    for (const nc of chantNC) {
      if (nc.loc > maxLoc) maxLoc = nc.loc;
      if (nc.loc < minLoc) minLoc = nc.loc;
    }

    // Initialize counts for entire ambitus
    const counts = {};
    const rhombus = {};
    for (let i = minLoc; i <= maxLoc; i++) {
      counts[i] = 0;
      rhombus[i] = 0;
    }

    // Count normal notes and rhombuses in a single pass
    for (const nc of chantNC) {
      if (nc.tilt === "se") {
        rhombus[nc.loc]++;
      } else {
        counts[nc.loc]++;
      }
    }

    // Sort keys once
    const sortedKeys = Object.keys(counts).sort(
      (a, b) => Number(a) - Number(b),
    );
    const finalis = chantNC[chantNC.length - 1];

    // Build chart data
    const labels = sortedKeys.map((key) =>
      key == finalis.loc ? `${key} (finalis)` : key,
    );

    const datasets = [
      {
        label: "Number of notes",
        data: sortedKeys.map((key) => counts[key]),
        backgroundColor: new Array(sortedKeys.length).fill(COLORS.normalBg),
        borderColor: new Array(sortedKeys.length).fill(COLORS.normalBorder),
        borderWidth: 1,
      },
      {
        label: "Rhombus",
        data: sortedKeys.map((key) => rhombus[key]),
        backgroundColor: new Array(sortedKeys.length).fill(COLORS.rhombusBg),
        borderColor: new Array(sortedKeys.length).fill(COLORS.rhombusBorder),
        borderWidth: 1,
      },
    ];

    return { labels, datasets };
  }

  /**
   * Take the Square neume component list, output useable chant data for the chart
   *
   * @param {NeumeComponent[]} chantNC
   */
  function getChantDataSquare(chantNC) {
    let lowestSeptenary = Infinity;
    let highestSeptenary = -Infinity;

    // Find range and build pitch list in a single pass
    const pitchList = chantNC.map((nc) => {
      const septenary = toSeptenary(nc);
      if (septenary > highestSeptenary) highestSeptenary = septenary;
      if (septenary < lowestSeptenary) lowestSeptenary = septenary;
      return `${nc.pitch}${nc.octave}`;
    });

    // Initialize counts for entire ambitus
    const counts = {};
    for (let i = lowestSeptenary; i <= highestSeptenary; i++) {
      const note = septenaryToPitchOctave(i);
      counts[note] = 0;
    }

    // Count the frequency of each note
    for (const note of pitchList) {
      counts[note]++;
    }

    const sortedKeys = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    const finalis = chantNC[chantNC.length - 1];
    const finalisKey = `${finalis.pitch}${finalis.octave}`;

    // Build chart data
    const labels = sortedKeys.map((key) =>
      key === finalisKey ? `${key} (finalis)` : key,
    );

    const datasets = [
      {
        label: "Number of notes",
        data: sortedKeys.map((key) => counts[key]),
        backgroundColor: new Array(sortedKeys.length).fill(COLORS.normalBg),
        borderColor: new Array(sortedKeys.length).fill(COLORS.normalBorder),
        borderWidth: 1,
      },
    ];

    return { labels, datasets };
  }

  /**
   * Take the Old Hispanic syllable list, output usable chant data for the chart
   *
   * @param {Syllable[]} chantSyls
   */
  function getChantDataOldHispanic(chantSyls) {
    const labels = [];
    const data = [];

    for (let i = 0; i < chantSyls.length; i++) {
      const curSyl = chantSyls[i];

      // Add spacing after word boundaries
      if (i > 0) {
        const prevSyl = chantSyls[i - 1];
        const position = prevSyl.syllableWord.position;
        if (position === "t" || position === "s") {
          labels.push(" ");
          data.push(0);
        }
      }

      labels.push(curSyl.syllableWord.text);
      data.push(curSyl.neumeComponents.length);
    }

    return {
      labels,
      datasets: [
        {
          label: "Number of notes",
          data,
          backgroundColor: new Array(labels.length).fill(COLORS.normalBg),
          borderColor: new Array(labels.length).fill(COLORS.normalBorder),
          borderWidth: 1,
        },
      ],
    };
  }

  onMount(() => {
    const isOldHispanic = chant.notationType === "old_hispanic";
    let chantData;
    let config;

    if (isOldHispanic) {
      chantData = getChantDataOldHispanic(chant.syllables);

      config = {
        titleText: "Number of Neume Components Across Chant",
        xText: "Text",
        yText: "Number of Neume Components",
        xTick: 12,
        chartLegend: false,
      };
    } else {
      const notes = getNeumeComponentList(chant.syllables);
      chantData =
        chant.notationType === "aquitanian"
          ? getChantDataAquitanian(notes)
          : getChantDataSquare(notes);

      config = {
        titleText: "Frequency of the notes across the chant ambitus",
        xText: "Ambitus",
        yText: "Frequency",
        xTick: 14,
        chartLegend: {
          labels: {
            display: true,
            font: { size: 14 },
          },
        },
      };
    }

    // Set canvas size - make it wider if there are more than 10 columns
    const numColumns = chantData.labels.length;
    const minWidth = 720;
    const columnWidth = 64;
    const calculatedWidth = numColumns > 10 ? numColumns * columnWidth : minWidth;
    
    if (chart) {
      chart.width = calculatedWidth;
      chart.height = 480;
    }

    // Create the chart
    new Chart(chart, {
      type: "bar",
      data: chantData,
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: config.titleText,
            font: {
              size: 18,
              weight: "bold",
            },
            padding: 14,
          },
          legend: config.chartLegend ? {
            ...config.chartLegend,
            labels: {
              ...config.chartLegend.labels,
              font: { size: 15, weight: "bold" },
              padding: 8,
            },
          } : config.chartLegend,
        },
        scales: {
          x: {
            stacked: true,
            title: {
              display: true,
              padding: 2,
              text: config.xText,
              font: {
                size: 15,
                weight: "bold",
              },
            },
            ticks: {
              font: {
                size: 13,
              },
              padding: 3,
            },
          },
          y: {
            stacked: true,
            title: {
              display: true,
              text: config.yText,
              font: {
                size: 15,
                weight: "bold",
              },
              padding: 2,
            },
            ticks: {
              font: {
                size: 13,
              },
              padding: 3,
            },
          },
        },
        layout: {
          padding: 0,
          margin: 0,
        },
      },
    });
  });
</script>

<div
  class="border-2 rounded-lg border-gray-300 mx-auto mt-4 p-4"
  style="overflow-x: auto; overflow-y: hidden; min-height: 520px; width: 60vw; max-width: 100%;"
>
  <div style="width: fit-content; margin: 0 auto;">
    <canvas bind:this={chart}></canvas>
  </div>
</div>