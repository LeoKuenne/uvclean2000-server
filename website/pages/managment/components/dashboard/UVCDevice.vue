<template>
  <router-link :to="{ name: 'devices', query: { device: this.device.serialnumber } }"
    class="cursor-default" tag="div">
    <div class="">
      <div :class="[ device.alarmState ? 'bg-red-500' : 'bg-primary' ]"
        class="p-2 items-center text-white">
        <div class="flex flex-row justify-between items-center">
          <div>
            <h3 class="text-md font-bold">{{device.name}}</h3>
            <h4 class="text-sm text-gray-200">SN: {{device.serialnumber}}</h4>
            <router-link :to="{ name: 'groups', query: { group: this.device.group._id } }"
              class="text-sm text-gray-200 hover:underline"
              v-if="device.group.name !== undefined">
              Group: {{device.group.name}}
            </router-link>
          </div>
          <dropdownMenu
            class="text-primary z-10"
            :showIcon="true"
            :menuItems="[
              {text: 'Edit', disabled: this.$root.$dataStore.user.canEdit === false},
              {text: 'View chart', disabled: false},
              {text: 'Add to Group', disabled: this.$root.$dataStore.user.canEdit === false},
              {text: 'Acknowledge', disabled: this.$root.$dataStore.user.canEdit === false},
              {text: 'Identify', disabled: this.$root.$dataStore.user.canEdit === false},
              {text: 'Reset',  disabled: this.$root.$dataStore.user.canEdit === false}
            ]"
            @itemClicked="menuItemClicked($event)">
          </dropdownMenu>
        </div>
      </div>
      <div
        class="relative">
        <div v-if="showAlarmPopup"
          class="absolute w-full h-full bg-black opacity-40">
        </div>
        <div v-if="showAlarmPopup"
          class="absolute w-full h-full flex items-center justify-center">
          <div class="bg-gray-100 w-2/3 flex flex-col items-center justify-between
            rounded shadow border-2 border-red-500">
            <h1 class="m-5 text-red-500 font-bold text-xl">An alarm occurred!</h1>
            <p
              v-for="alarm in alarmPropertie" :key="alarm"
              class="w-full text-red-500 font-bold text-lg text-center whitespace-normal">
              {{ alarm }}
            </p>
            <button class="p-3 m-5 text-gray-900 font-bold text-center bg-gray-200 transform
              hover:scale-105 duration-75"
              @click="$emit('acknowledgeAlarm', {
                serialnumber: device.serialnumber,
                prop: 'acknowledge',
              }); showAlarmPopup=false;">
              Acknowledge
            </button>
          </div>
          <!-- <div class="bg-red-500 w-2/3 flex flex-col items-center justify-between
            rounded shadow border-2 border-red-500">
            <h1 class="m-5 text-white font-bold text-xl">An alarm occurred!</h1>
            <p
              v-for="alarm in alarmPropertie" :key="alarm"
              class="w-full text-white font-bold text-lg text-center whitespace-normal">
              {{ alarm }}
            </p>
            <button class="p-3 m-5 text-gray-900 font-bold text-center bg-gray-200 transform
              hover:scale-105 duration-75"
              @click="$emit('acknowledgeAlarm', {
                serialnumber: device.serialnumber,
                prop: 'acknowledge',
              }); showAlarmPopup=false;">
              Acknowledge
            </button>
          </div> Version 2 -->
        </div>
        <div class="p-2 grid grid-cols-2 space-y-2 items-center">
          <label for="b_device_state">Device State</label>
          <button id="b_device_state"
            class="p-2 text-white hover:transform hover:scale-105 transition-all"
            :class="{ 'bg-green-500': device.engineState, 'bg-red-500': !device.engineState }"
            @click="$emit('changeState', {
              serialnumber: device.serialnumber,
              prop: 'engineState',
              newValue: !device.engineState
            })"
            :disabled="$dataStore.user.canEdit === false">
            {{state}}
          </button>
          <label for="b_eventmode">Eventmode</label>
          <button id="b_eventmode"
            class="p-2 text-white hover:transform hover:scale-105 transition-all"
            v-bind:class="{ 'bg-green-500': device.eventMode, 'bg-red-500': !device.eventMode }"
            @click="$emit('changeState', {
              serialnumber: device.serialnumber,
              prop: 'eventMode',
              newValue: !device.eventMode
            })"
            :disabled="$dataStore.user.canEdit === false">
            {{eventMode}}
          </button>

          <!-- <label for="b_identify">Identify</label>
          <button id="b_identify"
            class="p-2 text-white hover:transform hover:scale-105 transition-all"
            :class="{ 'bg-green-500': device.identifyMode, 'bg-red-500': !device.identifyMode }"
            @click="$emit('changeState', {
              serialnumber: device.serialnumber,
              prop: 'identifyMode',
              newValue: !device.identifyMode
            })"
            :disabled="$dataStore.user.canEdit === false">
            {{identifyMode}}
          </button> -->
          <label for="s_engine_level">Engine Level</label>
          <select name="engine_level"
            id="s_engine_level"
            :value="device.engineLevel"
            @change="$emit('changeState', {
              serialnumber: device.serialnumber,
              prop: 'engineLevel',
              newValue: $event.target.value
            })"
            :disabled="$dataStore.user.canEdit === false">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>

          <h4 class="text-lg pt-5 font-bold col-span-2">Statistics:</h4>

          <router-link tag="div" :to="{
            name: 'DeviceChart',
            query: {
              device: this.device.serialnumber,
              propertie: 'airVolume',
              }
            }"
            class="col-span-2 flex justify-between cursor-pointer">
            <span class="font-semibold">Air Volume</span>
            <span class="text-right" v-if="device.currentAirVolume">
              {{device.currentAirVolume.volume}} m&sup3;/h
            </span>
          </router-link>

          <router-link tag="div" :to="{
            name: 'DeviceChart',
            query: {
              device: this.device.serialnumber,
              propertie: 'tacho',
              }
            }"
            class="col-span-2 flex justify-between cursor-pointer">
            <span class="font-semibold">Rotation speed</span>
            <span class="text-right" v-if="device.tacho">{{device.tacho.tacho}} R/min</span>
          </router-link>

          <div class="col-span-2">
            <div class="flex justify-between">
              <span class="font-semibold">Lamp values (V)</span>
              <button
                class="bg-transparent text-color hover:bg-transparent py-0 m-0 hover:transform
                  hover:scale-105 transition-all"
                @click="showLampValues = !showLampValues">
                <svg v-if="!showLampValues"
                  xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-6 h-6" viewBox="0 0 16 16">
                  <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133
                    13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168
                    2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83
                    1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12
                    0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                  <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7
                    0 3.5 3.5 0 0 1-7 0z"/>
                </svg>
                <svg v-if="showLampValues"
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
              <div v-if="showLampValues" class="col-span-2  grid grid-cols-4">
                <div class=""
                  v-for="(lampValue, lamp) in device.currentLampValue"
                  :key="lamp">
                  {{lampValue.lamp}}: {{lampValue.value}}
                </div>
              </div>
            </transition>
          </div>
          <div class="col-span-2 flex justify-between" v-if="showCurrentBodyStateSection">
            <span class="font-semibold">Body Temperature Alarm</span>
            <span class="text-right" v-if="device.currentBodyState">
              {{device.currentBodyState.state}}
            </span>
          </div>
          <div class="col-span-2 flex justify-between" v-if="showCurrentFanStateSection">
            <span class="font-semibold">Fan Temperature Alarm</span>
            <span class="text-right" v-if="device.currentFanState">
              {{device.currentFanState.state}}
            </span>
          </div>
          <div class="col-span-2 flex flex-col space-y-5 pb-5"
            v-if="currentLampStates.length !== 0">
            <div class="">
              <div class="flex justify-between">
                <span class="font-semibold">Alarm states</span>
                <button
                  class="bg-transparent text-color hover:bg-transparent py-0 m-0 hover:transform
                    hover:scale-105 transition-all"
                  @click="showAlarmStates = !showAlarmStates">
                  <svg v-if="!showAlarmStates"
                    xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-6 h-6" viewBox="0 0 16 16">
                    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133
                      13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168
                      2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83
                      1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12
                      0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7
                      0 3.5 3.5 0 0 1-7 0z"/>
                  </svg>
                  <svg v-if="showAlarmStates"
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
                <div v-if="showAlarmStates" class="col-span-2 grid grid-cols-4">
                  <div class="w-20" v-for="(state, lamp) in currentLampStates" :key="lamp">
                    {{state.lamp}}: {{state.state}}
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>
      </div>
    </div>
  </router-link>
</template>
<script>
import DropdownMenu from './DropdownMenu.vue';

export default {
  name: 'UVCDevice',
  props: ['device'],
  components: {
    dropdownMenu: DropdownMenu,
  },
  methods: {
    async menuItemClicked(event) {
      switch (event) {
        case 'Edit':
          this.$emit('edit', this.device);
          break;
        case 'View chart':
          await this.$router.push({ name: 'DeviceChart', query: { device: this.device.serialnumber } })
            .catch((failure) => {
              console.log(failure);
            });
          break;
        case 'Add to Group':
          this.$emit('assignGroup', this.device);
          break;
        case 'Reset':
          this.$emit('reset', {
            serialnumber: this.device.serialnumber,
          });
          break;
        case 'Identify':
          this.$emit('identify', {
            serialnumber: this.device.serialnumber,
          });
          break;
        case 'Acknowledge':
          this.$emit('acknowledgeAlarm', {
            serialnumber: this.device.serialnumber,
            prop: 'acknowledge',
          });
          this.showAlarmPopup = false;
          break;
        default:
          break;
      }
    },
  },
  watch: {
    device: {
      deep: true,
      handler() {
        this.showCurrentBodyStateSection = this.device.currentBodyState.state.toLowerCase() !== 'ok';
        this.showCurrentFanStateSection = this.device.currentFanState.state.toLowerCase() !== 'ok';
        this.currentLampStates = this.device.currentLampState.filter((lampState) => lampState.state.toLowerCase() !== 'ok');

        this.alarmPropertie = [];
        this.currentLampStates.forEach((states) => {
          this.alarmPropertie.push(`Lamp: ${states.lamp}, State: ${states.state}`);
        });
        if (this.showCurrentFanStateSection) this.alarmPropertie.push('Fan States: Alarm');
        if (this.showCurrentBodyStateSection) this.alarmPropertie.push('Body States: Alarm');

        if (this.showAlarmPopup === false && this.device.alarmState === true) {
          this.showAlarmPopup = true;
        }
        if (this.showAlarmPopup === true && this.device.alarmState === false) {
          this.showAlarmPopup = false;
        }
      },
    },
  },
  created() {
    this.showCurrentBodyStateSection = this.device.currentBodyState.state.toLowerCase() !== 'ok';
    this.showCurrentFanStateSection = this.device.currentFanState.state.toLowerCase() !== 'ok';
    this.currentLampStates = this.device.currentLampState.filter((lampState) => lampState.state.toLowerCase() !== 'ok');

    this.alarmPropertie = [];
    this.currentLampStates.forEach((states) => {
      this.alarmPropertie.push(`Lamp: ${states.lamp}, State: ${states.state}`);
    });
    if (this.showCurrentFanStateSection) this.alarmPropertie.push('Fan States: Alarm');
    if (this.showCurrentBodyStateSection) this.alarmPropertie.push('Body States: Alarm');

    if (this.showAlarmPopup === false && this.device.alarmState === true) {
      this.showAlarmPopup = true;
    }
    if (this.showAlarmPopup === true && this.device.alarmState === false) {
      this.showAlarmPopup = false;
    }
  },
  data() {
    return {
      showAlarmStates: true,
      showLampValues: true,
      hasDeviceAlarm: false,
      showAlarmPopup: false,
      alarmPropertie: [],
      showCurrentBodyStateSection: this.device.currentBodyState.state.toLowerCase() !== 'ok',
      showCurrentFanStateSection: this.device.currentFanState.state.toLowerCase() !== 'ok',
      currentLampStates: this.device.currentLampState.filter((lampState) => lampState.state.toLowerCase() !== 'ok'),
    };
  },
  computed: {
    state: {
      get() {
        return this.device.engineState ? 'On' : 'Off';
      },
      set() {
        return this.device.engineState ? 'On' : 'Off';
      },
    },
    eventMode: {
      get() {
        return this.device.eventMode ? 'On' : 'Off';
      },
      set() {
        return this.device.eventMode ? 'On' : 'Off';
      },
    },
    identifyMode: {
      get() {
        return this.device.identifyMode ? 'On' : 'Off';
      },
      set() {
        return this.device.identifyMode ? 'On' : 'Off';
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
