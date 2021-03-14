<template>
  <div class="flex flex-col md:flex-row text-color">
    <Sidebar
      class="flex mx-2 mt-2 p-5 border border-gray-500 rounded justify-around
        md:space-y-2 md:flex-col md:w-2/6 md:justify-start md:max-h-full md:m-5"
      @showDevices="showDevices"
      @showGroups="showGroups">
    </Sidebar>
    <transition name="fade" mode="out-in">
      <router-view
        class="w-full px-5 md:w-5/6 h-full"
        @groupAdd="groupAdd($event)"
        @groupUpdate="groupChangeState($event)"
        @groupDelete="groupDelete($event)">
      </router-view>
    </transition>
    <!-- <component v-bind:is="currentViewComponent"
      class="flex-grow"
      ></component> -->
  </div>
</template>

<script>
import Sidebar from '../components/dashboard/Sidebar.vue';

export default {
  name: 'Dashboard',
  components: {
    Sidebar,
  },
  computed: {
    currentViewComponent() {
      return this.currentView;
    },
  },
  methods: {
    showDevices() {
      this.$router.push({ name: 'devices' });
    },
    showGroups() {
      this.$router.push({ name: 'groups' });
    },
  },
  created() {

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
