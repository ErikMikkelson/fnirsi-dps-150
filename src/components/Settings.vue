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
  <div v-if="device">
    <v-table density="compact" style="width: 30em">
      <tbody>
        <tr>
          <th>Brightness</th>
          <td @click="emit('edit-brightness')" class="changeable">
            {{ device.brightness || 0 }}
            <v-btn size="x-small" color="green" variant="flat">set</v-btn>
          </td>
        </tr>
        <tr>
          <th>Volume</th>
          <td @click="emit('edit-volume')" class="changeable">
            {{ device.volume || 0 }}
            <v-btn size="x-small" color="green" variant="flat">set</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
  <div v-else>
    <p>Loading device information...</p>
  </div>
</template>
