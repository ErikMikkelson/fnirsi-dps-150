<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps({
  program: {
    type: String,
    required: true,
  },
  programExamples: {
    type: Array,
    required: true,
  },
  programRunning: {
    type: Boolean,
    required: true,
  },
  programRemaining: {
    type: Number,
    required: true,
  },
});

const emit = defineEmits(['update:program', 'run-program', 'abort-program']);

const programRef = ref(props.program);
</script>

<template>
  <div class="d-flex">
    <div class="flex-fill" style="margin-right: 10px">
      <v-textarea
        :model-value="program"
        @update:model-value="(v) => emit('update:program', v)"
        prepend-icon="mdi-code-block-parentheses"
        style="width: 100%"
        rows="10"
        auto-grow
      ></v-textarea>
      <div class="text-right">
        <v-btn size="small">
          Examples
          <v-menu activator="parent">
            <v-list>
              <v-list-item
                @click="emit('update:program', (example as any).code)"
                v-for="example in programExamples"
                :key="(example as any).name"
                :title="(example as any).name"
              ></v-list-item>
            </v-list>
          </v-menu>
        </v-btn>
      </div>
    </div>
    <div style="width: 25em">
      <v-table density="compact">
        <tbody>
          <tr>
            <th>V(v)</th>
            <td>Set voltage to `v`</td>
          </tr>
          <tr>
            <th>V()</th>
            <td>Get current set voltage</td>
          </tr>
          <tr>
            <th>I(i)</th>
            <td>Set current to `i`</td>
          </tr>
          <tr>
            <th>I()</th>
            <td>Get current set current</td>
          </tr>
          <tr>
            <th>ON()</th>
            <td>Enable output</td>
          </tr>
          <tr>
            <th>OFF()</th>
            <td>Disable output</td>
          </tr>
          <tr>
            <th>SLEEP(ms)</th>
            <td>Sleep `ms`</td>
          </tr>
          <tr>
            <th>times(n, f)</th>
            <td>Run `f` for `n` times</td>
          </tr>
        </tbody>
      </v-table>
      <v-card variant="plain">
        <v-card-text>
          The program is executed once and for all. It then builds a command queue. The actual output control is then
          performed according to the command queue.
        </v-card-text>
      </v-card>
    </div>
  </div>
  <v-btn color="green" @click="emit('run-program')" v-if="!programRunning">Run</v-btn>
  <v-btn color="red" @click="emit('abort-program')" v-else>Abort ({{ programRemaining }} remains)</v-btn>
</template>
