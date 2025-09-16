<script setup lang="ts">
import { reactive } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  descriptionHtml: {
    type: String,
    default: '',
  },
  unit: {
    type: String,
    default: '',
  },
  units: {
    type: Array,
    default: () => [],
  },
  input: {
    type: [String, Number],
    default: '',
  },
  prev: {
    type: [String, Number],
    default: '',
  },
});

const emit = defineEmits(['update:modelValue', 'input']);

const numberInput = reactive({
  input: '',
});

function numberInputChar(char: string) {
  const UNITS: { [key: string]: number } = {
    'G': 1e9, 'M': 1e6, 'k': 1e3, 'x1': 1, 'm': 1e-3, 'µ': 1e-6, 'n': 1e-9, 'p': 1e-12,
    'mV': 1e-3, 'V': 1, 'mA': 1e-3, 'A': 1, 'mW': 1e-3, 'W': 1, '℃': 1,
  };

  if (/^[0-9]$/.test(char)) {
    numberInput.input += char;
  } else if (char === '.') {
    if (!numberInput.input.includes('.')) {
      numberInput.input += char;
    }
  } else if (char === 'Backspace' || char === '\u232B') {
    if (numberInput.input.length) {
      numberInput.input = numberInput.input.slice(0, -1);
    } else {
      emit('update:modelValue', false);
    }
  } else if (char === '-') {
    if (numberInput.input[0] === '-') {
      numberInput.input = numberInput.input.slice(1);
    } else {
      numberInput.input = '-' + numberInput.input;
    }
  } else if (UNITS[char]) {
    const base = parseFloat(numberInput.input);
    emit('input', base * UNITS[char]);
    emit('update:modelValue', false);
  }
}

function numberInputButton(e: Event) {
    const char = (e.target as HTMLElement).textContent?.replace(/\s+/g, '');
    if (char) {
        numberInputChar(char);
    }
}

function formatNumberForInput(number: string | number, sep = ',') {
    if (typeof number === 'number') {
        number = number.toFixed(3);
    }
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}
</script>

<template>
  <v-dialog width="auto" :model-value="modelValue" @update:model-value="(v) => emit('update:modelValue', v)" id="numberInput">
    <v-card :title="title">
      <v-divider class="mt-3"></v-divider>
      <v-card-text>
        <div style="height: 100%; width: 100%; display: flex; flex-direction: column">
          <div style="flex: 1">
            <div v-html="descriptionHtml" v-if="descriptionHtml"></div>
            <div v-else>
              {{ description || '' }}
            </div>
          </div>
          <div id="numberInputting">
            <span class="number" v-if="numberInput.input">{{ formatNumberForInput(numberInput.input) }}</span>
            <span class="number" v-else style="color: rgba(0,0,0,.54);">{{ formatNumberForInput(prev) }}</span>
            <span class="unit">{{ unit }}</span>
          </div>
          <table id="numberInput">
            <tbody>
              <tr>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">7</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">8</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">9</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton" v-show="units[0]">{{ units[0] }}</v-btn></td>
              </tr>
              <tr>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">4</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">5</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">6</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton" v-show="units[1]">{{ units[1] }}</v-btn></td>
              </tr>
              <tr>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">1</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">2</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">3</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton" v-show="units[2]">{{ units[2] }}</v-btn></td>
              </tr>
              <tr>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">0</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">.</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">&#x232B;</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton" v-show="units[3]">{{ units[3] }}</v-btn></td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>

      <template v-slot:actions>
        <v-btn class="ms-auto" text="Cancel" @click="emit('update:modelValue', false)"></v-btn>
      </template>
    </v-card>
  </v-dialog>
</template>
