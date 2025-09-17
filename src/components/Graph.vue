<script setup lang="ts">
import { ref, onMounted } from 'vue';
// @ts-ignore
import Plotly from 'plotly.js/dist/plotly.min.js';

const props = defineProps({
  history: {
    type: Array,
    required: true,
  },
  graphOptions: {
    type: Object,
    required: true,
  },
  connected: {
    type: Boolean,
    required: true,
  },
});

const graph = ref<HTMLDivElement | null>(null);

function updateGraph() {
  if (!graph.value) return;
  const voltage = {
    mode: 'lines+markers',
    x: [],
    y: [],
    name: 'Voltage',
    line: {
      width: 3,
      color: '#38a410',
      shape: 'linear',
    },
    hovertemplate: '%{y:.3f}V',
  };
  const current = {
    mode: 'lines+markers',
    x: [],
    y: [],
    name: 'Current',
    yaxis: 'y2',
    line: {
      width: 3,
      color: '#e84944',
      shape: 'linear',
    },
    hovertemplate: '%{y:.3f}A',
  };
  const power = {
    mode: 'lines+markers',
    x: [],
    y: [],
    name: 'Power',
    yaxis: 'y3',
    line: {
      width: 3,
      color: '#0097d2',
      shape: 'linear',
    },
    hovertemplate: '%{y:.3f}W',
  };

  for (let i = 0; i < props.history.length; i++) {
    const h = props.history[i] as { time: Date; v: number; i: number; p: number };
    voltage.x.push(h.time as any);
    voltage.y.push(h.v as any);
    current.x.push(h.time as any);
    current.y.push(h.i as any);
    power.x.push(h.time as any);
    power.y.push(h.p as any);
    if (i > 60) break;
  }

  const data = [];
  if (props.graphOptions.voltage) {
    data.push(voltage);
  }
  if (props.graphOptions.current) {
    data.push(current);
  }
  if (props.graphOptions.power) {
    data.push(power);
  }

  const layout = {
    title: { text: props.connected ? '' : 'Device is not connected', y: 0.5, x: 0.5 },
    showlegend: false,
    margin: {
      t: 0,
      b: 50,
      l: 0,
      r: 0,
    },
    xaxis: {
      domain: [0.1, 0.9],
      type: 'date',
      range: [
        new Date(Date.now() - 1000 * props.graphOptions.duration),
        new Date(),
      ],
      tickformat: '%H:%M:%S',
    },
    yaxis: {
      title: {
        text: 'V',
        font: { color: '#38a410' },
      },
      tickfont: { color: '#38a410' },
      minallowed: 0,
      rangemode: 'tozero',
      autorange: 'max',
    },
    yaxis2: {
      title: {
        text: 'I',
        font: { color: '#e84944' },
      },
      tickfont: { color: '#e84944' },
      anchor: 'free',
      overlaying: 'y',
      side: 'left',
      position: 0.05,
      minallowed: 0,
      rangemode: 'tozero',
      autorange: 'max',
    },
    yaxis3: {
      title: {
        text: 'P',
        font: { color: '#0097d2' },
      },
      tickfont: { color: '#0097d2' },
      anchor: 'x',
      overlaying: 'y',
      side: 'right',
      minallowed: 0,
      rangemode: 'tozero',
      autorange: 'max',
    },
  };

  Plotly.react(graph.value, data, layout, {
    displayModeBar: false,
    responsive: true,
  });
}

onMounted(() => {
  updateGraph();
});

defineExpose({
  updateGraph,
});
</script>

<template>
  <div ref="graph" style="height: 100%"></div>
</template>
