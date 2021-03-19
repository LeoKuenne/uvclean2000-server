<template>
  <div class="relativ">
    <div class="absolute right-0 space-x-2 flex m-2">
      <div>
        <button
          class="p-2 bg-white shadow"
          v-show="showToggleAllCharts"
          @click="toggleAllCharts">{{toggleCharts}}
        </button>
      </div>
      <button
        class="bg-primary p-2 text-white shadow"
        @click="showSettingPanelAndFetchData(); loaded = true;">
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="h-5 w-5" viewBox="0 0 16 16">
          <path fill-rule="evenodd"
          d="M11.5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM9.05 3a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5
          2.5 0 0 1-4.9 0H0V3h9.05zM4.5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM2.05 8a2.5 2.5 0 0 1
          4.9 0H16v1H6.95a2.5 2.5 0 0 1-4.9 0H0V8h2.05zm9.45 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0
          0-3zm-2.45 1a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0v-1h9.05z"/>
        </svg>
      </button>
    </div>
    <div v-if="showSettingPanel"
      class="fixed top-0 left-0 h-screen w-screen
      bg-black bg-opacity-50 flex justify-center items-center"
      @click="outsideSettingPanelClicked">
      <div class="absolute flex flex-col p-5 bg-secondary space-y-5" @click.stop>
        <div class="flex justify-between items-center">
          <h1 class="font-bold text-xl">Datavisualization</h1>
          <button class="bg-transparent hover:bg-transparent p-0 m-0"
            @click="showSettingPanel = false">
            <svg
              xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-6 h-6 text-black" viewBox="0 0 16 16">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1
                .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646
                2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>
        <span class="text-red-500 font-bold"
          :class="[(errorMessage !== '') ? 'visible' : 'hidden']">{{errorMessage}}</span>
        <div class="w-full">
          <label for="group">Choose the group:</label>
          <select name="group"
            id="group"
            class="text-black w-full p-2 rounded border border-primary"
            v-model="selectedGroup"
            @change="showPropertie = true">
            <option v-for="group in groups"
              :key="group.id"
              :value="group">
              {{ group.name }}
            </option>
          </select>
        </div>
        <div :class="[showPropertie || (selectedGroup !== undefined) ? 'visible' : 'invisible' ] ">
          <label for="propertie">Choose the propertie:</label>
          <select name="propertie"
            id="propertie"
            class="text-black w-full p-2 rounded border border-primary"
            v-model="selectedPropertie"
            @change="getDateDuration">
            <option value="airVolume">Air Volume</option>
            <option value="tacho">Tachos</option>
          </select>
        </div>
        <div>
          <div class="relative">
            <div class="absolute w-full h-full flex items-center justify-center">
              <div v-if="datepickerLoad" class="lds-ring">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
              </div>
            </div>
            <div :class="[showDatepicker ? 'visible' : 'invisible']"
              class="relative">
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
            </div>
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
      <div v-if="!loaded"
        class="absolute top-1/2 left-1/2 origin-center lds-ring">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      <chart v-if="loaded"
      :showAllCharts="showAllCharts"
      :chartData="datacollection"
      :options="options"
      :style="chartStyles"
      class="p-16"></chart>
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
  props: ['group', 'propertie', 'from', 'to'],
  data() {
    return {
      loaded: true,
      showPropertie: false,
      showDatepicker: false,
      datepickerLoad: false,
      showToggleAllCharts: false,
      showSettingPanel: true,
      showAllCharts: true,
      selectedGroup: this.group,
      selectedPropertie: '',
      selectedDateFrom: '',
      selectedDateTo: '',
      errorMessage: '',
      groups: [],
      canRefresh: false,
      disabledDates: {

      },
      datacollection: {
        datasets: [],
      },
      options: {
        title: {
          display: true,
          position: 'top',
          text: ['Group Chart'],
          fontSize: 18,
          // fontFamily: 'Inter',
        },
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          xAxes: [{
            // stacked: true,
            type: 'time',
            distribution: 'linear',
            time: {
              tooltipFormat: 'dd.MM.yyyy H:mm:ss',
              // tooltipFormat: 'DD.MM.YY HH:mm:ss.SSS',
              minUnit: 'second',
              unit: 'minute',
              displayFormats: {
                // millisecond: 'DD.MM.YY HH:mm:ss.SSS',
                // second: 'DD.MM.YY HH:mm:ss.SSS',
                // minute: 'DD.MM.YY HH:mm:ss.SSS',
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
              maxRotation: 90,
              minRotation: 90,
            },
          }],
          yAxes: [{
            stacked: true,
            ticks: {
              callback(value) {
                return `${value}`;
              },
            },
          }],
        },
        tooltips: {
          mode: 'label',
          callbacks: {
            label(tooltipItems, data) {
              const device = data.datasets[tooltipItems.datasetIndex].label;
              const value = data.datasets[tooltipItems.datasetIndex].data[tooltipItems.index];

              let total = 0;
              for (let i = 0; i < data.datasets.length; i += 1) {
                if (!data.datasets[i].hidden
                  && data.datasets[i].data.length < tooltipItems.index) {
                  total += data.datasets[i].data[tooltipItems.index].y;
                }
              }

              if (tooltipItems.datasetIndex !== data.datasets.length - 1) {
                return `${device}: ${value.y}`;
              }
              return [`${device}: ${value.y}`, `Total: ${total}`];
            },
          },
        },
      },
    };
  },
  computed: {
    toggleCharts() {
      return (this.showAllCharts) ? 'Show all charts' : 'Hide all charts';
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
      this.canRefresh = (newDate !== this.from);
      this.selectedDateFrom = newDate;
    },
    selectedDateTo(newDate) {
      this.canRefresh = (newDate !== this.to);
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
    async showSettingPanelAndFetchData() {
      this.showSettingPanel = true;
      await this.getGroups();
      await this.getDateDuration();
    },
    async fetchData() {
      if (this.group === undefined) {
        this.showSettingPanelAndFetchData();
        return;
      }
      let response = await fetch(`/api/group?id=${this.group}`);
      if (response.status !== 200) {
        throw new Error('No data available');
      }
      let data = await response.json();
      this.selectedGroup = {
        name: data.name,
        id: data.id,
      };

      if (this.propertie === undefined) {
        this.showSettingPanelAndFetchData();
        return;
      }
      this.selectedPropertie = this.propertie;
      this.showDatepicker = true;

      if (this.from === undefined) {
        this.showSettingPanelAndFetchData();
        return;
      }
      this.selectedDateFrom = this.from;
      this.disabledDates = {
        from: this.selectedDateFrom,
      };

      if (this.to === undefined) {
        this.showSettingPanelAndFetchData();
        return;
      }
      this.selectedDateTo = this.to;
      this.disabledDates = {
        from: this.selectedDateFrom,
        to: this.selectedDateTo,
      };

      this.loaded = false;
      this.showSettingPanel = false;

      this.selectedPropertie = this.propertie;

      this.selectedDateFrom = this.from;
      this.selectedDateTo = this.to;
      response = await fetch(`/api/groupData?group=${this.selectedGroup.id}&propertie=${this.propertie}&from=${this.from}&to=${this.to}`);
      if (response.status === 404) {
        throw new Error('No data available');
      }
      data = await response.json();

      this.datacollection.datasets.length = 0;

      switch (this.propertie) {
        case 'airVolume':
          for (let i = 0; i < data.length; i += 1) {
            const color = `rgba(0,${50 + (((255 - 50) / data.length) * i)},${80 + (((255 - 80) / data.length) * i)})`;
            this.datacollection.datasets.push({
              label: `${this.selectedGroup.name} | ${data[i][0].device}`,
              backgroundColor: color,
              borderColor: color,
              borderWidth: 1,
              data: [],
              fill: false,
              hidden: true,
            });
            data[i].forEach((event) => {
              this.datacollection.datasets[i].data.push({
                t: DateTime.fromISO(event.date),
                // t: new Date(event.date),
                y: event.volume,
              });
            });
          }

          break;
        case 'tacho':
          for (let i = 0; i < data.length; i += 1) {
            const color = `rgba(0,${50 + (((255 - 50) / data.length) * i)},${80 + (((255 - 80) / data.length) * i)})`;
            this.datacollection.datasets.push({
              label: `${this.selectedGroup.name} | ${data[i][0].device}`,
              backgroundColor: color,
              borderColor: color,
              borderWidth: 1,
              data: [],
              fill: false,
              hidden: true,
            });
            data[i].forEach((event) => {
              this.datacollection.datasets[i].data.push({
                t: DateTime.fromISO(event.date),
                y: event.tacho,
              });
            });
          }
          break;

        default:
          break;
      }

      this.options.title.text = [
        `Group: ${this.selectedGroup.name}, ${this.selectedPropertie} | `
        + `from: ${new Date(this.selectedDateFrom).toLocaleString()} to: ${new Date(
          this.selectedDateTo,
        ).toLocaleString()}`,
      ];

      this.showToggleAllCharts = true;
      this.loaded = true;
    },
    async refreshChart() {
      await this.$router.push({
        name: 'GroupChart',
        query: {
          group: this.selectedGroup.id,
          propertie: this.selectedPropertie,
          from: this.selectedDateFrom,
          to: this.selectedDateTo,
        },
      });
    },
    async getGroups() {
      await fetch('/api/groups').then((response) => response.json())
        .then((data) => {
          this.groups = [];
          data.forEach((group) => {
            this.groups.push({
              id: group.id,
              name: group.name,
            });
          });
        });
    },
    async getDateDuration() {
      this.showDatepicker = false;
      if (!this.selectedPropertie) return;
      this.datepickerLoad = true;
      await fetch(`/api/timestamps?group=${this.selectedGroup.id}&propertie=${this.selectedPropertie}`)
        .then((response) => {
          if (response.status === 404) {
            throw new Error('No data avalaible');
          }
          this.errorMessage = '';
          return response.json();
        }).then((data) => {
          this.disabledDates = {
            from: data.from,
            to: data.to,
          };

          this.selectedDateFrom = data.from;
          this.selectedDateTo = data.to;
          this.showDatepicker = true;
        }).catch((err) => {
          this.errorMessage = err;
          this.showDatepicker = false;
        });

      this.datepickerLoad = false;
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
  border: 8px solid #00666F;
  border-radius: 50%;
  animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  border-color: #00666F transparent transparent transparent;
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
