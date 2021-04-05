<!-- hover:bg-primary hover:text-white duration-75 ease-in-out -->
<template>
  <button
    :class="[active ? 'bg-primary text-white' : 'border text-primary',
      !disabled ? 'hover:scale-105 border-gray-500' : 'cursor-default border-gray-300']"
    class="w-12 h-12 rounded-full text-center m-1
    flex items-center justify-center uppercase transform duration-75"
    @click="$emit('dayClicked', day)">
    {{dayText}}
  </button>
</template>
<script>
export default {
  name: 'scheduledEventExecuteDay',
  props: ['day', 'active', 'disabled'],
  data() {
    return {
      selected: false,
    };
  },
  computed: {
    dayText() {
      switch (this.day) {
        case 1:
          return 'Mon';
        case 2:
          return 'The';
        case 3:
          return 'Wed';
        case 4:
          return 'Thu';
        case 5:
          return 'Fri';
        case 6:
          return 'Sat';
        case 7:
          return 'Sun';
        default:
          return '';
      }
    },
  },
};
</script>
