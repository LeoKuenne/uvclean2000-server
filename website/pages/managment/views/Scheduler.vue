<template>
  <div class="p-2 flex flex-col overflow-auto">
    <div class="flex items-center space-x-5 p-2 pb-5">
      <h2 class="text-lg font-bold">Scheduled Events</h2>
      <button
        v-if="$dataStore.user.userrole.rules.canEditUser.allowed"
        @click="showAddForm()"
        class="flex text-left text-primary bg-white shadow-md items-center p-2
        hover:text-gray-500 hover:transform hover:scale-105
          hover:font-semibold transition-all">
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-5 h-5 mr-2" viewBox="0 0 16 16">
          <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2
            2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
          <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1
            0-1h3v-3A.5.5 0 0 1 8 4z"/>
        </svg>
        Add Scheduled Event
      </button>
    </div>
    <router-link to="scheduler"
      class="cursor-default flex flex-wrap flex-grow items-start justify-center"
      tag="div"
      @click="$route.query.event=''">
      <schedule-event v-for="scheduledEvent in $dataStore.scheduledEvents"
        :key="scheduledEvent.name" :scheduleEvent="scheduledEvent"
        :class="[(event === scheduledEvent.name) ? 'transform scale-105': '']"
        :ref="'event' + scheduledEvent.name"
        class="duration-200 p-5"
        @editScheduleEvent="showEditForm($event)">
      </schedule-event>
    </router-link>
    <uvc-form
      :errorMessage="errorMessage"
      :show="showForm"
      :title="formTitle">
      <label for="eventTitle">Name:</label>
      <input type="text" class="border border-gray-500 rounded p-2" placeholder="Turn on Stage"
        v-model="formEvent.name">
      <h2>Time to execute at:</h2>
      <div class="flex items-center">
        <datetime
          id="dateFrom"
          :title="'Time to execute at:'"
          v-model="formEvent.time.timeofday"
          :type="'time'"
          class="border border-gray-500 rounded">
        </datetime>
        <div class="flex w-full justify-center">
          <execute-day v-for="index in 7" :key="index"
            :active="formEvent.time.days.indexOf(index) >= 0" :day="index"
            @dayClicked="formDayClicked(index)">
          </execute-day>
        </div>
      </div>
      <h2>Actions:</h2>
      <div class="">
        <action v-for="(action, i) in formEvent.actions"
          :key="i" :action="action" :active="true"
          @deleteClicked="formDeleteAction(i)">
        </action>
        <button class="flex justify-center items-center p-2 w-2/3 mx-auto
          transform duration-75 hover:scale-105"
              @click="formEvent.actions.push({
                group: $dataStore.groups[0].id,
                propertie: 'engineState',
                newValue: 'false'
              })">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-5 h-5 mr-2" viewBox="0 0 16 16">
            <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2
              0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1
              0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
          <span>Add action</span>
        </button>
      </div>
      <div class="">
        <button
          class="float-left p-2 font-semibold hover:transform hover:scale-105 transition-all
          text-red-500"
          v-show="isFormEdit"
          :disabled="!isFormEdit"
          @click="deleteScheduleEvent(formEvent)">
          Delete
        </button>
        <div class="float-right space-x-2">
          <button class="font-semibold p-2 hover:transform hover:scale-105 transition-all
            bg-primary text-white"
            @click="(isFormEdit) ? updateScheduledEvent(formEvent) : addScheduledEvent(formEvent)">
            {{okProp}}
          </button>
          <button class="font-semibold p-2 hover:transform hover:scale-105 transition-all"
            @click="closeUserForm">
            Close
          </button>
        </div>
      </div>
    </uvc-form>
  </div>
</template>

<script>
import { Datetime } from 'vue-datetime';
import ScheduleEvent from '../components/scheduler/ScheduleEvent.vue';
import UVCForm from '../components/UVCForm.vue';
import ExecuteDay from '../components/scheduler/ExecuteDay.vue';
import Action from '../components/scheduler/Action.vue';

export default {
  name: 'scheduler',
  computed: {
    currentViewComponent() {
      return this.currentView;
    },
    formTitle() {
      return 'Add scheduled event';
    },
    okProp() {
      return (this.isFormEdit) ? 'Update' : 'Add';
    },
  },
  watch: {
    event() {
      if (this.event !== undefined && this.event.match(/[0-9]/gm)) {
        this.scrollToElement(this.event);
      }
    },
  },
  mounted() {
    this.$nextTick(() => {
      if (this.device !== undefined && this.device.match(/[0-9]/gm)) {
        this.scrollToElement(this.event);
      }
    });
  },
  methods: {
    async updateScheduledEvent(event) {
      const response = await fetch('/api/scheduler/event', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: event.name }),
      });

      if (response.status !== 201) {
        const json = await response.json();
        this.errorMessage = json.msg;
        return;
      }

      this.$dataStore.scheduledEvents = await this.$root.getScheduledEvents();
      this.showForm = false;
    },
    async deleteScheduleEvent(event) {
      const response = await fetch('/api/scheduler/event', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: event.name }),
      });

      if (response.status !== 201) {
        const json = await response.json();
        this.errorMessage = json.msg;
        return;
      }

      this.$dataStore.scheduledEvents = await this.$root.getScheduledEvents();
      this.showForm = false;
    },
    /**
     * Called if the device is selected in the query
     */
    scrollToElement(event) {
      const element = this.$refs[`event${event}`];
      if (element && element[0]) {
        element[0].$el.scrollIntoView({ behavior: 'smooth' });
      }
    },
    async addScheduledEvent(scheduledEvent) {
      const response = await fetch('/api/scheduler/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduledEvent),
      });

      const json = await response.json();
      if (response.status !== 201) {
        this.errorMessage = json.msg;
        return;
      }

      this.$dataStore.scheduledEvents = await this.$root.getScheduledEvents();
      this.showForm = false;
    },
    formDeleteAction(i) {
      console.log(i, this.formEvent.actions);
      this.formEvent.actions.splice(i, 1);
      console.log(this.formEvent.actions);
    },
    formDayClicked(day) {
      console.log(this.formEvent.time.days.indexOf(day));
      if (this.formEvent.time.days.indexOf(day) >= 0) {
        this.formEvent.time.days.splice(
          this.formEvent.time.days.indexOf(day), 1,
        );
        console.log(this.formEvent.time.days);
        return;
      }
      this.formEvent.time.days.push(day);
    },
    showAddForm() {
      this.formEvent = {
        name: '',
        time: {
          timeofday: new Date().toISOString(),
          days: [],
        },
        actions: [],
      };
      this.showForm = true;
    },
    showEditForm(event) {
      this.isFormEdit = true;
      this.formEvent = event;
      this.showForm = true;
    },
    closeUserForm() {
      this.showForm = false;
    },
  },
  async created() {
    this.$dataStore.scheduledEvents = await this.$root.getScheduledEvents();
  },
  data() {
    return {
      prop_showAddForm: false,
      isFormEdit: false,
      showForm: false,
      errorMessage: '',
      formEvent: {
        name: '',
        time: {
          timeofday: new Date().toISOString(),
          days: [],
        },
        actions: [],
      },
      // scheduleEvent: {
      //   name: 'TestEvent',
      //   time: {
      //     timeofday: new Date(),
      //     days: [1, 2, 5],
      //   },
      //   actions: [
      //     {
      //       group: '605a2e6b34b3f96860b18a69',
      //       propertie: 'engineState',
      //       newValue: 'false',
      //     },
      //     {
      //       group: '605a2e6b34b3f96860b18a69',
      //       propertie: 'engineLevel',
      //       newValue: '1',
      //     },
      //   ],
      // },
    };
  },
  props: ['event'],
  components: {
    ScheduleEvent,
    'uvc-form': UVCForm,
    ExecuteDay,
    datetime: Datetime,
    Action,
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
