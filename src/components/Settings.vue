<script setup lang="ts">


defineProps({
  device: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['edit-brightness', 'edit-volume']);
</script>

<template>
  <v-table density="compact" style="width: 30em">
    <tbody>
      <tr>
        <th>Brightness</th>
        <td @click="emit('edit-brightness')" class="changeable">
          {{ device.brightness }}
          <v-btn size="x-small" color="green" variant="flat">set</v-btn>
        </td>
      </tr>
      <tr>
        <th>Volume</th>
        <td @click="emit('edit-volume')" class="changeable">
          {{ device.volume }}
          <v-btn size="x-small" color="green" variant="flat">set</v-btn>
        </td>
      </tr>
    </tbody>
  </v-table>
</template>
