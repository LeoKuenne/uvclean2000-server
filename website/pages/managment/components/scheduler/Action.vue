<!-- eslint-disable vue/no-mutating-props -->
<template>
  <div>
    <!-- <div class="grid grid-cols-3 border border-gray-300 m-1 p-1 rounded">
      <span>Change group <b>{{action.group}}'s</b></span>
      <span>Propertie <b>{{action.propertie}}</b></span>
      <span>to <b>{{action.newValue}}</b></span>
    </div> -->

    <div class="flex justify-around items-center space-x-2 p-2 border m-1 rounded"
      :class="[active ? 'border-gray-500' : 'border-gray-300']">
      <select v-model="action.group" :disabled="!active"
        :class="[active ? 'bg-gray-200 p-2 rounded' : '']">
        <option v-for="group in $dataStore.groups" :key="group.name" :value="group.id">
          {{group.name}}
        </option>
      </select>
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="h-4 w-4" viewBox="0 0 16 16">
        <path fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1
          .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1
          1 8z"/>
      </svg>
      <select v-model="action.propertie" :disabled="!active"
        :class="[active ? 'bg-gray-200 p-2 rounded' : '']">
        <option value="engineState">Engine State</option>
        <option value="engineLevel">Engine Level</option>
        <option value="eventMode">Event Mode</option>
      </select>
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="h-4 w-4" viewBox="0 0 16 16">
        <path fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1
          .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1
          1 8z"/>
      </svg>
      <select name="" id="" v-model="action.newValue" :disabled="!active"
        :class="[active ? 'bg-gray-200 p-2 rounded' : '']">
        <option v-if="action.propertie !== 'engineLevel'" value="true">On</option>
        <option v-if="action.propertie !== 'engineLevel'" value="false">Off</option>
        <option v-if="action.propertie === 'engineLevel'" value="1">1</option>
        <option v-if="action.propertie === 'engineLevel'" value="2">2</option>
        <option v-if="action.propertie === 'engineLevel'" value="3">3</option>
        <option v-if="action.propertie === 'engineLevel'" value="4">4</option>
        <option v-if="action.propertie === 'engineLevel'" value="5">5</option>
      </select>
      <button @click="$emit('deleteClicked')" v-if="active">
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="h-8 w-8 stroke-2" viewBox="0 0 16 16">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707
            8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8
            4.646 5.354a.5.5 0 0 1 0-.708z"/>
        </svg>
      </button>
    </div>
  </div>
</template>
<script>
export default {
  name: 'scheduledEventAction',
  props: ['action', 'active'],
};
</script>
