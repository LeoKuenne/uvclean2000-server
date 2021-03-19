<template>
  <div class="relativ">
    <div class="absolute right-0 space-x-2 flex m-2">
      <div>
        <button class="p-2 bg-white shadow" v-show="showToggleAllCharts" @click="toggleAllCharts">
          {{ toggleCharts }}
        </button>
      </div>
      <button class="bg-primary p-2 text-white shadow" @click="showSettingPanel = true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          class="h-5 w-5"
          viewBox="0 0 16 16"
        >
          <path
            fill-rule="evenodd"
            d="M11.5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM9.05 3a2.5 2.5 0 0 1 4.9
            0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0V3h9.05zM4.5 7a1.5 1.5 0 1 0 0 3 1.5 1.5
            0 0 0 0-3zM2.05 8a2.5 2.5 0 0 1 4.9 0H16v1H6.95a2.5 2.5 0 0 1-4.9
            0H0V8h2.05zm9.45 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-2.45 1a2.5 2.5 0 0
            1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0v-1h9.05z"
          />
        </svg>
      </button>
    </div>
    <div
      v-if="showSettingPanel"
      class="fixed top-0 left-0 h-screen w-screen
      bg-black bg-opacity-50 flex justify-center items-center"
    >
      <div class="absolute flex flex-col p-5 bg-secondary space-y-5">
        <div class="flex justify-between items-center">
          <h1 class="font-bold text-xl">Datavisualization</h1>
          <button
            class="bg-transparent hover:bg-transparent p-0 m-0"
            @click="showSettingPanel = false"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              class="w-6 h-6 text-black"
              viewBox="0 0 16 16"
            >
              <path
                d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1
                .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646
                2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"
              />
            </svg>
          </button>
        </div>
        <span
          class="text-red-500 font-bold"
          :class="[errorMessage !== '' ? 'visible' : 'hidden']"
          >{{ errorMessage }}</span
        >
        <div class="w-full">
          <label for="device">Choose the device:</label>
          <select
            name="device"
            id="device"
            class="text-black w-full p-2 rounded border border-primary"
            v-model="selectedDevice"
            @change="showPropertie = true"
          >
            <option
              v-for="device in devices"
              :key="device.serialnumber"
              :value="device">
              {{ device.name }}
            </option>
          </select>
        </div>
        <div :class="[showPropertie || selectedDevice !== undefined ? 'visible' : 'invisible']">
          <label for="propertie">Choose the propertie:</label>
          <select
            name="propertie"
            id="propertie"
            class="text-black w-full p-2 rounded border border-primary"
            v-model="selectedPropertie"
            @change="getDateDuration"
          >
            <option value="airVolume">Air Volume</option>
            <option value="lampValues">Lamp Values</option>
            <option value="tacho">Tachos</option>
            <option value="fanVoltage">Fan Voltage</option>
            <option value="co2">CO2</option>
          </select>
        </div>
        <div :class="[showDatepicker ? 'visible' : 'invisible']">
          <label for="dateFrom">Choose the start date:</label>
          <div class="text-black w-full pb-5">
            <datetime
              id="dateFrom"
              v-model="selectedDateFrom"
              :min-datetime="disabledDates.from"
              :max-datetime="selectedDateTo"
              :type="'datetime'"
              class="border border-primary"
            >
            </datetime>
          </div>
          <label for="dateTo">Choose the end date:</label>
          <div class="text-black w-full">
            <datetime
              id="dateTo"
              v-model="selectedDateTo"
              :min-datetime="selectedDateFrom"
              :max-datetime="disabledDates.to"
              :type="'datetime'"
              class="border border-primary"
            >
            </datetime>
          </div>
          <button
            :class="[canRefresh ? 'visible' : 'invisible']"
            class="text-primary w-full text-center font-bold pt-5 hover:transform hover:scale-105
              transition-all"
            @click="refreshChart"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
    <div class="h-full w-full">
      <div v-if="!loaded" class="absolute top-1/2 left-1/2 origin-center lds-ring">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      <chart
        v-if="loaded"
        :showAllCharts="showAllCharts"
        :chartData="datacollection"
        :options="options"
        :style="chartStyles"
        class="p-16"
      ></chart>
    </div>
  </div>
</template>

<script>
import { Datetime } from 'vue-datetime';
import '../../../../css/datetime.css';
import Chart from './Chart.vue';

const { DateTime } = require('luxon');

export default {
  components: {
    Chart,
    datetime: Datetime,
  },
  props: ['device', 'propertie', 'from', 'to'],
  data() {
    return {
      loaded: true,
      showPropertie: false,
      showDatepicker: false,
      showToggleAllCharts: false,
      showSettingPanel: true,
      showAllCharts: true,
      selectedDevice: this.device,
      selectedPropertie: '',
      selectedDateFrom: '',
      selectedDateTo: '',
      errorMessage: '',
      devices: [],
      canRefresh: false,
      disabledDates: {},
      datacollection: {},
      options: {
        title: {
          display: true,
          position: 'top',
          text: ['Device Chart'],
          fontSize: 18,
          // fontFamily: 'Inter',
        },
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          xAxes: [
            {
              // stacked: true,
              type: 'time',
              distribution: 'linear',
              time: {
                tooltipFormat: 'dd.MM.yyyy H:mm:ss',
                minUnit: 'second',
                unit: 'minute',
                displayFormats: {
                  millisecond: 'dd.MM.yyyy H:mm:ss',
                  second: 'dd.MM.yyyy H:mm:ss',
                  minute: 'dd.MM.yyyy H:mm:ss',
                },
              },
              // adapters: {
              //   date: {
              //   },
              // },
              ticks: {
                autoSkip: true,
                maxRotation: 90,
                minRotation: 90,
              },
            },
          ],
          yAxes: [
            {
              ticks: {
                callback(value) {
                  return `${value}`;
                },
              },
            },
          ],
        },
      },
    };
  },
  computed: {
    toggleCharts() {
      return this.showAllCharts ? 'Show all charts' : 'Hide all charts';
    },
    chartStyles() {
      return {
        height: '100%',
        width: '100%',
        position: 'relativ',
      };
    },
  },
  async created() {
    await this.getDevices();

    try {
      await this.fetchData();
    } catch (error) {
      console.error(error);
      this.errorMessage = error;
    }
  },
  watch: {
    async $route() {
      try {
        await this.fetchData();
      } catch (error) {
        console.error(error);
        this.errorMessage = error;
      }
    },
    selectedDateFrom(newDate) {
      this.canRefresh = newDate !== this.from;
      this.selectedDateFrom = newDate;
    },
    selectedDateTo(newDate) {
      this.canRefresh = newDate !== this.to;
      this.selectedDateTo = newDate;
    },
  },
  methods: {
    toggleAllCharts() {
      this.showAllCharts = !this.showAllCharts;
    },
    outsideSettingPanelClicked() {
      this.showSettingPanel = false;
    },
    async fetchData() {
      if (this.device === undefined) {
        this.showSettingPanel = true;
        return;
      }
      let response = await fetch(`/api/device?device=${this.device}`);
      if (response.status === 404) {
        throw new Error('No data available');
      }
      let data = await response.json();
      this.selectedDevice = {
        name: data.name,
        serialnumber: data.serialnumber,
      };
      console.log(this.selectedDevice);

      if (this.propertie === undefined) {
        this.showSettingPanel = true;
        return;
      }
      this.selectedPropertie = this.propertie;
      this.showDatepicker = true;

      if (this.from === undefined) {
        this.showSettingPanel = true;
        return;
      }
      this.selectedDateFrom = this.from;
      this.disabledDates = {
        from: this.selectedDateFrom,
      };

      if (this.to === undefined) {
        this.showSettingPanel = true;
        return;
      }
      this.selectedDateTo = this.to;
      this.disabledDates = {
        from: this.selectedDateFrom,
        to: this.selectedDateTo,
      };

      this.loaded = false;
      this.showSettingPanel = false;

      response = await fetch(
        `/api/deviceData?device=${this.selectedDevice.serialnumber}&propertie=${this.propertie}&from=${this.from}&to=${this.to}`,
      );
      if (response.status === 404) {
        throw new Error('No data avalaible');
      }
      data = await response.json();

      const lamps = [];

      switch (this.propertie) {
        case 'airVolume':
          this.datacollection.datasets = [
            {
              label: this.selectedDevice.name,
              backgroundColor: '#00666F',
              borderColor: '#00666F',
              borderWidth: 1,
              data: [],
              fill: false,
              spanGaps: true,
            },
          ];

          data.forEach((event) => {
            this.datacollection.datasets[0].data.push({
              t: DateTime.fromISO(event.date),
              y: event.volume,
            });
          });
          break;
        case 'lampValues':
          for (let i = 0; i < 16; i += 1) {
            const color = `rgba(0,${50 + ((255 - 50) / 16) * i},${80 + ((255 - 80) / 16) * i})`;
            lamps.push({
              label: `${this.selectedDevice.name} | Lamp ${i + 1}`,
              backgroundColor: color,
              borderColor: color,
              borderWidth: 1,
              data: [],
              fill: false,
              hidden: true,
              spanGaps: true,
            });
          }
          data.forEach((event) => {
            lamps[event.lamp - 1].data.push({
              t: DateTime.fromISO(event.date),
              y: event.value,
            });
          });

          this.datacollection.datasets = lamps;

          break;
        case 'tacho':
          this.datacollection.datasets = [
            {
              label: this.selectedDevice.name,
              backgroundColor: '#00666F',
              borderColor: '#00666F',
              borderWidth: 1,
              data: [],
              fill: false,
            },
          ];

          data.forEach((event) => {
            this.datacollection.datasets[0].data.push({
              t: DateTime.fromISO(event.date),
              y: event.tacho,
            });
          });
          break;
        case 'fanVoltage':
          this.datacollection.datasets = [
            {
              label: this.selectedDevice.name,
              backgroundColor: '#00666F',
              borderColor: '#00666F',
              borderWidth: 1,
              data: [],
              fill: false,
            },
          ];

          data.forEach((event) => {
            this.datacollection.datasets[0].data.push({
              t: DateTime.fromISO(event.date),
              y: event.voltage,
            });
          });
          break;
        case 'co2':
          this.datacollection.datasets = [
            {
              label: this.selectedDevice.name,
              backgroundColor: '#00666F',
              borderColor: '#00666F',
              borderWidth: 1,
              data: [],
              fill: false,
            },
          ];

          data.forEach((event) => {
            this.datacollection.datasets[0].data.push({
              t: DateTime.fromISO(event.date),
              y: event.co2,
            });
          });
          break;

        default:
          break;
      }

      this.options.title.text = [
        `Device: ${this.selectedDevice.name}, ${this.selectedPropertie} | `
        + `from: ${new Date(this.selectedDateFrom).toLocaleString()} to: ${new Date(
          this.selectedDateTo,
        ).toLocaleString()}`,
      ];

      this.showToggleAllCharts = true;
      this.loaded = true;
    },
    async refreshChart() {
      await this.$router.push({
        name: 'DeviceChart',
        query: {
          device: this.selectedDevice.serialnumber,
          propertie: this.selectedPropertie,
          from: this.selectedDateFrom,
          to: this.selectedDateTo,
        },
      });
    },
    async getDevices() {
      await fetch('/api/devices')
        .then((response) => response.json())
        .then((data) => {
          this.devices = [];
          data.forEach((device) => {
            this.devices.push({
              serialnumber: device.serialnumber,
              name: device.name,
            });
          });
        });
    },
    async getDateDuration() {
      this.showDatepicker = false;
      await fetch(
        `/api/timestamps?device=${this.selectedDevice.serialnumber}&propertie=${this.selectedPropertie}`,
      )
        .then((response) => {
          if (response.status === 404) {
            throw new Error('No data avalaible');
          }
          this.errorMessage = '';
          return response.json();
        })
        .then((data) => {
          this.disabledDates = {
            from: data.from,
            to: data.to,
          };

          this.selectedDateFrom = data.from;
          this.selectedDateTo = data.to;
          this.showDatepicker = true;
        })
        .catch((err) => {
          this.errorMessage = err;
          this.showDatepicker = false;
        });
    },
  },
};
</script>

<style>
.lds-ring {
  display: inline-block;
  position: relative;
  width: 80px;
  height: 80px;
}
.lds-ring div {
  box-sizing: border-box;
  display: block;
  position: absolute;
  width: 64px;
  height: 64px;
  margin: 8px;
  border: 8px solid #00666f;
  border-radius: 50%;
  animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  border-color: #00666f transparent transparent transparent;
}
.lds-ring div:nth-child(1) {
  animation-delay: -0.45s;
}
.lds-ring div:nth-child(2) {
  animation-delay: -0.3s;
}
.lds-ring div:nth-child(3) {
  animation-delay: -0.15s;
}
@keyframes lds-ring {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
