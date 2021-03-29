<template>
  <router-link :to="{ name: 'groups', query: { group: this.group.id } }"
    class="cursor-default" tag="div">
    <div>
      <div :class="[group.alarmState ? 'bg-red-500' : 'bg-primary']"
        class="p-2 items-center text-white">
        <div class="flex flex-row justify-between items-center">
          <div>
            <h3 class="text-md font-bold">{{group.name}}</h3>
            <h4 class="text-sm text-gray-200">ID: {{group.id}}</h4>
          </div>
          <dropdownMenu
            class="text-primary z-10"
            :showIcon="true"
            :menuItems="[
              {text: 'Edit',
                disabled: this.$root.$dataStore.user.userrole.rules.canChangeProperties
                  .allowed === false},
              {text: 'View chart', disabled: false},
              {text: 'Set Devices',
                disabled: this.$root.$dataStore.user.userrole.rules.canChangeProperties
                  .allowed === false},
            ]"
            @itemClicked="menuItemClicked($event)">
          </dropdownMenu>
        </div>
      </div>
      <div class="p-2">
        <h4 class="text-lg pt-2 font-bold col-span-2">Groupmembers:</h4>
        <div class="pl-2 space-y-1">
            <div
              v-for="device in group.devices"
              :key="device.serialnumber"
              class="p-2 rounded hover:underline cursor-pointer"
              :class="[device.alarmState ? 'bg-red-500 text-white' : 'bg-gray-200']">
              <router-link :to="'/dashboard/devices?device=' + device.serialnumber">
                <h5 class="font-semibold text-sm">{{device.name}}</h5>
                <h5 class="italic text-xs">SN: {{device.serialnumber}}</h5>
              </router-link>
            </div>
        </div>
      </div>
      <div class="p-2 grid grid-cols-2 space-y-2 items-center">
        <label for="b_group_state">Group Engine State</label>
        <button id="b_group_state"
          class="p-2 m-2 text-white hover:transform hover:scale-105 transition-all"
          v-bind:class="{
            'bg-green-500': group.engineState,
            'bg-red-500': !group.engineState,
            'bg-yellow-400': group.engineStateDevicesWithOtherState.length !== 0
            }"
          @click="$emit('changeState', {
            id: group.id,
            prop: 'engineState',
            newValue: !group.engineState
          })"
          :disabled="$dataStore.user.userrole.rules.canChangeProperties.allowed === false">
          {{state}}
        </button>
        <div class="col-span-2 px-2">
          <div class="flex justify-between items-center">
            <span class="text-sm">Devices that have not these state:</span>
            <button
              class="bg-transparent text-color hover:bg-transparent py-0 m-0 hover:transform
                hover:scale-105 transition-all"
              @click="showDevicesWithWrongStateEngineState = !showDevicesWithWrongStateEngineState">
              <svg v-if="!showDevicesWithWrongStateEngineState"
                xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-6 h-6" viewBox="0 0 16 16">
                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133
                  13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168
                  2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83
                  1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12
                  0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7
                  0 3.5 3.5 0 0 1-7 0z"/>
              </svg>
              <svg v-if="showDevicesWithWrongStateEngineState"
                xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-6 h-6" viewBox="0 0 16 16">
                <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0
                  0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168
                  2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83
                  1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829
                  2.829l.822.822zm-2.943 1.299l.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5
                  2.5 0 0 0 2.829 2.829z"/>
                <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172
                  8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8
                  12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3
                  13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884l-12-12
                  .708-.708 12 12-.708.708z"/>
              </svg>
            </button>
          </div>
          <transition name="slide">
            <div v-if="showDevicesWithWrongStateEngineState"
              class="pl-2 space-y-1">
              <div
                :class="[device.alarmState ? 'bg-red-500 text-white' : 'bg-gray-200']"
                class="p-2 rounded hover:underline cursor-pointer"
                v-for="device in group.engineStateDevicesWithOtherState"
                :key="device.serialnumber">
                <router-link :to="'/dashboard/devices?device=' + device.serialnumber">
                  <h5 class="font-semibold text-xs">{{device.name}}</h5>
                  <h5 class="italic text-xs">SN: {{device.serialnumber}}</h5>
                </router-link>
              </div>
            </div>
          </transition>
        </div>
        <label for="b_eventmode">Eventmode</label>
        <button id="b_eventmode"
          class="p-2 m-2 text-white hover:transform hover:scale-105 transition-all"
          v-bind:class="{
            'bg-green-500': group.eventMode,
            'bg-red-500': !group.eventMode,
            'bg-yellow-400': group.eventModeDevicesWithOtherState.length !== 0
            }"
          @click="$emit('changeState', {
            id: group.id,
            prop: 'eventMode',
            newValue: !group.eventMode
          })"
          :disabled="$dataStore.user.userrole.rules.canChangeProperties.allowed === false">
          {{eventMode}}
        </button>
        <div class="col-span-2 px-2">
          <div class="flex justify-between items-center">
            <span class="text-sm">Devices that have not these state:</span>
            <button
              class="bg-transparent text-color hover:bg-transparent py-0 m-0 hover:transform
                hover:scale-105 transition-all"
              @click="showDevicesWithWrongStateEventMode = !showDevicesWithWrongStateEventMode">
              <svg v-if="!showDevicesWithWrongStateEventMode"
                xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-6 h-6" viewBox="0 0 16 16">
                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133
                  13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168
                  2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83
                  1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12
                  0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7
                  0 3.5 3.5 0 0 1-7 0z"/>
              </svg>
              <svg v-if="showDevicesWithWrongStateEventMode"
                xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-6 h-6" viewBox="0 0 16 16">
                <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0
                  0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168
                  2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83
                  1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829
                  2.829l.822.822zm-2.943 1.299l.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5
                  2.5 0 0 0 2.829 2.829z"/>
                <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172
                  8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8
                  12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3
                  13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884l-12-12
                  .708-.708 12 12-.708.708z"/>
              </svg>
            </button>
          </div>
          <transition name="slide">
            <div v-if="showDevicesWithWrongStateEventMode"
              class="pl-2 space-y-1">
              <div
                :class="[device.alarmState ? 'bg-red-500 text-white' : 'bg-gray-200']"
                class="p-2 rounded hover:underline cursor-pointer"
                v-for="device in group.eventModeDevicesWithOtherState"
                :key="device.serialnumber">
                <router-link :to="'/dashboard/devices?device=' + device.serialnumber">
                  <h5 class="font-semibold text-xs">{{device.name}}</h5>
                  <h5 class="italic text-xs">SN: {{device.serialnumber}}</h5>
                </router-link>
              </div>
            </div>
          </transition>
        </div>
        <label for="s_engine_level">Engine Level</label>
        <select name="engine_level"
          class="p-2 m-2 border border-gray-300 rounded"
          id="s_engine_level"
          @change="$emit('changeState', {
            id: group.id,
            prop: 'engineLevel',
            newValue: $event.target.value
          })"
          :disabled="$dataStore.user.userrole.rules.canChangeProperties.allowed === false">
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
        <div class="col-span-2 px-2">
          <div class="flex justify-between items-center">
            <span class="text-sm">Devices that have not these state:</span>
            <button
              class="bg-transparent text-color hover:bg-transparent py-0 m-0 hover:transform
                hover:scale-105 transition-all"
              @click="showDevicesWithWrongStateEngineLevel = !showDevicesWithWrongStateEngineLevel">
              <svg v-if="!showDevicesWithWrongStateEngineLevel"
                xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-6 h-6" viewBox="0 0 16 16">
                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133
                  13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168
                  2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83
                  1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12
                  0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7
                  0 3.5 3.5 0 0 1-7 0z"/>
              </svg>
              <svg v-if="showDevicesWithWrongStateEngineLevel"
                xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-6 h-6" viewBox="0 0 16 16">
                <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0
                  0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168
                  2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83
                  1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829
                  2.829l.822.822zm-2.943 1.299l.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5
                  2.5 0 0 0 2.829 2.829z"/>
                <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172
                  8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8
                  12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3
                  13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884l-12-12
                  .708-.708 12 12-.708.708z"/>
              </svg>
            </button>
          </div>
          <transition name="slide">
            <div v-if="showDevicesWithWrongStateEngineLevel"
              class="pl-2 space-y-1">
              <div
                :class="[device.alarmState ? 'bg-red-500 text-white' : 'bg-gray-200']"
                class="p-2 rounded hover:underline cursor-pointer"
                v-for="device in group.engineLevelDevicesWithOtherState"
                :key="device.serialnumber">
                <router-link :to="'/dashboard/devices?device=' + device.serialnumber">
                  <h5 class="font-semibold text-xs">{{device.name}}</h5>
                  <h5 class="italic text-xs">SN: {{device.serialnumber}}</h5>
                </router-link>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </router-link>
</template>
<script>
import DropdownMenu from './DropdownMenu.vue';

export default {
  name: 'UVCGroup',
  props: ['group'],
  components: {
    dropdownMenu: DropdownMenu,
  },
  methods: {
    async menuItemClicked(event) {
      switch (event) {
        case 'Edit':
          this.$emit('edit', this.group);
          break;
        case 'View chart':
          await this.$router.push({ name: 'GroupChart', query: { group: this.group.serialnumber } })
            .catch((failure) => {
              console.log(failure);
            });
          break;
        case 'Set Devices':
          this.$emit('setDevices', this.group);
          break;
        default:
          break;
      }
    },
  },
  data() {
    return {
      showAlarmStates: true,
      showLampValues: true,
      showDevicesWithWrongStateEngineState: false,
      showDevicesWithWrongStateEventMode: false,
      showDevicesWithWrongStateEngineLevel: false,
    };
  },
  computed: {
    state: {
      get() {
        return this.group.engineState ? 'On' : 'Off';
      },
      set() {
        return this.group.engineState ? 'On' : 'Off';
      },
    },
    eventMode: {
      get() {
        return this.group.eventMode ? 'On' : 'Off';
      },
      set() {
        return this.group.eventMode ? 'On' : 'Off';
      },
    },
  },
};
</script>

<style>
.slide-enter-active,
.slide-leave-active {
  @apply duration-200;
  @apply ease-in-out;
}

.slide-enter-to, .slide-leave {
   max-height: 100px;
   overflow: hidden;
}

.slide-enter, .slide-leave-to {
   overflow: hidden;
   max-height: 0;
}
</style>
