<template>
  <router-link :to="{ name: 'scheduler', query: { event: this.scheduleEvent.id } }"
    class="flex" tag="div">
    <!-- <div class="w-28 p-2 px-5 flex items-center">
      <h2 class="w-full text-center">
        at {{new Date(scheduleEvent.time.timeofday).getHours()}}:{{
          new Date(scheduleEvent.time.timeofday).getMinutes()}}
      </h2>
    </div> -->
    <div class="space-y-4 border border-gray-500 shadow bg-white">
      <div class="p-2 flex justify-between bg-primary text-white">
        <div>
          <h2 class="w-full text-white">
            at {{new Date(scheduleEvent.time.timeofday).toLocaleTimeString(undefined,
              { hour: '2-digit', minute: '2-digit' })}}
          </h2>
          <h1 class="text-lg font-bold">{{scheduleEvent.name}}</h1>
        </div>
        <dropdownMenu
          v-if="$root.$dataStore.user.userrole.rules.canEditScheduler.allowed"
          class="text-primary z-10 justify-self-end"
          :showIcon="true"
          :menuItems="[
            {text: 'Edit',
              disabled: this.$root.$dataStore.user.userrole.rules.canChangeProperties
                .allowed === false},
            {text: 'Test execution',
              disabled: this.$root.$dataStore.user.userrole.rules.canChangeProperties
                .allowed === false},
          ]"
          @itemClicked="menuItemClicked($event)">
        </dropdownMenu>
      </div>
      <div class="flex justify-center flex-wrap">
      <!-- <h2>Days to execute at:</h2> -->
        <execute-day v-for="index in 7" :key="index"
          :active="scheduleEvent.time.days.indexOf(index) >= 0" :day="index"
          :disabled="true">
        </execute-day>
      </div>
      <div class="px-2 text-sm">
        <h2>Actions to perform:</h2>
        <div class="p-2 flex flex-col">
          <action v-for="(action,i) in scheduleEvent.actions"
            :key="i" :action="action">
          </action>
        </div>
      </div>
    </div>
  </router-link>
</template>
<script>
import ExecuteDay from './ExecuteDay.vue';
import Action from './Action.vue';
import DropdownMenu from '../dashboard/DropdownMenu.vue';

export default {
  name: 'scheduledEvent',
  methods: {
    menuItemClicked(item) {
      switch (item) {
        case 'Edit':
          this.$emit('editScheduleEvent', this.scheduleEvent);
          break;
        case 'Test execution':
          this.$emit('testScheduleEvent', this.scheduleEvent);
          break;

        default:
          break;
      }
    },
  },
  components: {
    ExecuteDay,
    Action,
    DropdownMenu,
  },
  props: {
    scheduleEvent: {
      type: Object,
      required: true,
    },
  },
};
</script>
