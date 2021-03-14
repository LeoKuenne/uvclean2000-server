<template>
  <div id="sidebar"
    class="whitespace-nowrap">
    <h1 class="hidden md:flex text-xl text-secondary font-bold">Overview</h1>
    <div
      :class="[this.$route.path === '/dashboard/devices' ?
        'text-gray-600 transform scale-105 font-bold border-l-4 border-secondary' : '']"
      @click="$emit('showDevices')"
      class="md:w-full p-2 text-left text-primary
      hover:text-gray-600 hover:transform hover:scale-105 hover:font-bold
      transition-all inline-flex items-center">
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-5 h-5 mr-2"
        viewBox="0 0 16 16">
        <path d="M11 2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3h6zM5 1a4 4 0
          0 0-4 4v6a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V5a4 4 0 0 0-4-4H5z"/>
      </svg>
      Show Devices
    </div>
    <div
      :class="[this.$route.path === '/dashboard/groups' ?
        'text-gray-600 transform scale-105 font-bold border-l-4 border-secondary' : '']"
      @click="$emit('showGroups')"
      class="md:w-full p-2 text-left text-primary
        hover:text-gray-600 hover:transform hover:scale-105 hover:font-bold
        transition-all inline-flex items-center">
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-5 h-5 mr-2" viewBox="0 0 16 16">
        <path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm2-2a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0
          1h-7zM0 13a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 16 13V6a1.5 1.5 0 0 0-1.5-1.5h-13A1.5
          1.5 0 0 0 0 6v7zm1.5.5A.5.5 0 0 1 1 13V6a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5v7a.5.5 0 0
          1-.5.5h-13z"/>
      </svg>
      Show Groups
    </div>
  </div>
</template>
<script>

export default {
  data() {
    return {
      device: {
        name: '',
        serialnumber: '',
      },
    };
  },
  methods: {
    showAddForm() {
      this.prop_showAddForm = true;
    },
    addDevice(device) {
      this.$emit('deviceAdd', device);
      this.prop_showAddForm = false;
      // this.device = {
      //   name: '',
      //   serialnumber: '',
      // };
    },
  },

};
</script>
