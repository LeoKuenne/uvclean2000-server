<template>
  <div class="flex flex-col md:flex-row text-color">
    <div
      class="flex mx-2 mt-2 p-5 border border-gray-500 rounded justify-around
        md:space-y-2 md:flex-col md:w-min md:min-w-min md:justify-start md:max-h-full md:m-5
        whitespace-nowrap">
      <div class="space-y-2">
        <h1 class="hidden md:flex text-xl text-secondary font-bold">Overview</h1>
        <router-link
          :to="{ name: 'settingsUserList' }"
          :class="[this.$route.path === '/settings/user' ?
            'text-gray-600 transform scale-105 font-bold border-l-4 border-secondary' : '']"
          @click="$emit('showUser')"
          class="md:w-full p-2 text-left text-primary
            hover:text-gray-600 hover:transform hover:scale-105 hover:font-bold
            transition-all inline-flex items-cente">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-5 h-5 mr-2" viewBox="0 0 16 16">
            <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
            <path fill-rule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75
              1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216z"/>
            <path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>
          </svg>
          User
        </router-link>
      </div>
    </div>
    <transition name="fade" mode="out-in">
      <router-view
        class="w-full h-full p-12">
      </router-view>
    </transition>
  </div>
</template>

<script>
// import Sidebar from '../components/dashboard/Sidebar.vue';

export default {
  name: 'Settings',
  components: {
    // Sidebar,
  },
  data() {
    return {
      prop_showAddForm: false,
    };
  },
};
</script>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity .2s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
