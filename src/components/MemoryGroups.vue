<script setup lang="ts">
const props = defineProps({
  groups: {
    type: Array,
    required: true,
  },
  groupsInput: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['set-group', 'edit-group-voltage', 'edit-group-current']);

function formatNumber(n: number) {
  if (n < 10) {
    return n.toFixed(3);
  } else {
    return n.toFixed(2);
  }
}

function groupChanged(group: any, type: 'V' | 'I' | null) {
  const input = (props.groupsInput as any)[group.n];
  if (!type || type === 'V') {
    if (input.setVoltage !== null && input.setVoltage !== group.setVoltage) {
      return true;
    }
  }
  if (!type || type === 'I') {
    if (input.setCurrent !== null && input.setCurrent !== group.setCurrent) {
      return true;
    }
  }
  return false;
}
</script>

<template>
  <v-list density="compact" style="max-width: 30em" class="groups">
    <v-list-item v-for="group in (groups as any[])" :key="group.n">
      <template v-slot:prepend>
        <v-btn size="x-small" :color="groupChanged(group, null) ? 'red' : 'green'" variant="flat" @click="emit('set-group', group)">
          M{{ group.n }}
          <v-tooltip activator="parent" location="start">
            {{ groupChanged(group, null) ? 'Update with changed values' : `Set M${group.n}` }}
          </v-tooltip>
        </v-btn>
      </template>

      <div @click="emit('edit-group-voltage', group)" class="changeable" :class="{ changed: groupChanged(group, 'V') }">
        {{ formatNumber(groupsInput[group.n].setVoltage || group.setVoltage) }}V
        <v-btn size="x-small" color="green" variant="flat">set</v-btn>
      </div>

      <div @click="emit('edit-group-current', group)" class="changeable" :class="{ changed: groupChanged(group, 'I') }">
        {{ formatNumber(groupsInput[group.n].setCurrent || group.setCurrent) }}A
        <v-btn size="x-small" color="green" variant="flat">set</v-btn>
      </div>
    </v-list-item>
  </v-list>
</template>
