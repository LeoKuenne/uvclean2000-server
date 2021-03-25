import Vue from 'vue';
import VueToast from 'vue-toast-notification';
import io from 'socket.io-client';
import App from './App.vue';
import router from './router/index';
import 'vue-toast-notification/dist/theme-default.css';
import '../../css/styles.css';

Vue.config.productionTip = false;

const store = Vue.observable({
  devices: [],
  groups: [],
  user: {},
  userroles: [],
  userroleRights: [],
  settings: {},
  users: [],
});

const urlParams = new URLSearchParams(window.location.search);
if (!urlParams.has('user')) {
  throw new Error('No user provided');
}

const paramUser = urlParams.get('user');
fetch(`/api/user?username=${paramUser}`)
  .then((response) => {
    if (response.status !== 200) {
      throw new Error(response.msg);
    }
    return response.json();
  })
  .then((response) => {
    store.user = response.user;
    console.log(store);
  }).then(() => {
    // eslint-disable-next-line no-undef
    const socket = io();

    Vue.prototype.$dataStore = store;
    Vue.use(VueToast);

    new Vue({
      render: (h) => h(App),
      router,
      data: {
        socket: (store.user.userrole.rules.canChangeProperties.allowed) ? socket : null,
      },
      async created() {
        window.onbeforeunload = () => {
          socket.emit('leave', this.username);
        };

        socket.on('error', (error) => {
          console.error('error in backend', error);
          Vue.$toast.open({
            type: 'error',
            message: `Server Error: ${error.message}`,
            duration: 5000,
          });
        });

        socket.on('info', (info) => {
          console.log('info in backend', info);
          Vue.$toast.open({
            type: 'info',
            message: `Server Info: ${info.message}`,
            duration: 5000,
          });
        });

        socket.on('warn', (warn) => {
          console.log('warn in backend', warn);
          Vue.$toast.open({
            type: 'warning',
            message: `Server Warn: ${warn.message}`,
            duration: 5000,
          });
        });

        socket.on('device_alarm', (alarmProp) => {
          console.log('Event: device_alarm', alarmProp);
          this.$dataStore.devices.filter((device) => {
            if (device.serialnumber === alarmProp.serialnumber) {
              const dev = device;
              dev.alarmState = `${alarmProp.alarmValue}` !== 'false';
            }
            return device;
          });
        });

        socket.on('databaseConnected', () => {
          console.log('info in backend: database is connected');
          Vue.$toast.open({
            type: 'info',
            message: 'Server Info: Database is connected',
            duration: 5000,
          });
          this.fetchDataFromServer();
        });

        socket.on('group_deviceAlarm', (alarmProp) => {
          console.log('Event: group_deviceAlarm', alarmProp);
          this.$dataStore.groups.filter((group) => {
            if (group.id === alarmProp.group) {
              const grou = group;
              grou.alarmState = `${alarmProp.alarmValue}` !== 'false';
              group.devices.filter((dev) => {
                if (dev.serialnumber === alarmProp.serialnumber) {
                  console.log(dev);
                  // eslint-disable-next-line no-param-reassign
                  dev.alarmState = `${alarmProp.alarmValue}` !== 'false';
                  console.log(dev);
                }
                return dev;
              });
            }
            return group;
          });
        });

        socket.on('device_added', (device) => {
          console.log('Event: device_added', device);
          this.$dataStore.devices.push(device);
        });

        socket.on('user_added', (user) => {
          console.log('Event: user_added', user);
          this.$dataStore.users.push(user);
        });

        socket.on('user_deleted', async (user) => {
          console.log('Event: user_deleted', user);
          let index = 0;
          this.$dataStore.users.filter((u) => {
            if (u.username === user.username) {
              index = this.$dataStore.users.indexOf(u);
            }
            return u;
          });
          console.log(index);
          this.$dataStore.users.splice(index, 1);
        });

        socket.on('user_updated', async (user) => {
          console.log('Event: user_updated', user);
          this.$dataStore.users.filter((u) => {
            const us = u;
            if (u.username === user.username) {
              us.username = user.newUsername;
              us.userrole.rules.canChangeProperties.allowed = user.userrole.rules
                .canChangeProperties.allowed;
            }
            return u;
          });
        });

        socket.on('device_deleted', async (device) => {
          console.log('Event: device_deleted', device);

          await this.fetchDataFromServer();
        });

        socket.on('group_added', (group) => {
          console.log('Event: group_added', group);
          this.$dataStore.groups.push(group);
        });

        socket.on('group_deleted', async () => {
          console.log('Event: group_deleted');
          await this.fetchDataFromServer();
        });

        socket.on('group_deviceAdded', async () => {
          console.log('Event: group_deviceAdded');

          await this.fetchDataFromServer();
        });

        socket.on('group_deviceDeleted', async (prop) => {
          console.log('Event: group_deviceDeleted', prop);

          await this.fetchDataFromServer();
        });

        socket.on('device_stateChanged', (props) => {
          // console.log('Event: device_stateChanged', props);

          this.$dataStore.devices.filter((device) => {
            if (device.serialnumber === props.serialnumber) {
              const dev = device;
              let propertie = '';
              switch (props.prop) {
                case 'name':
                  dev.name = `${props.newValue}`;
                  break;
                case 'currentFanState':
                  dev[props.prop] = { state: `${props.newValue}` };
                  break;
                case 'currentBodyState':
                  dev[props.prop] = { state: `${props.newValue}` };
                  break;
                case 'engineState':
                case 'eventMode':
                  dev[props.prop] = (`${props.newValue}` === 'true');
                  break;
                case 'tacho':
                  if (dev[props.prop] === undefined) {
                    dev[props.prop] = { tacho: parseInt(props.newValue, 10) };
                  } else {
                    dev[props.prop].tacho = parseInt(props.newValue, 10);
                  }
                  break;
                case 'currentAirVolume':
                  if (dev[props.prop] === undefined) {
                    dev[props.prop] = { volume: parseInt(props.newValue, 10) };
                  } else {
                    dev[props.prop].volume = parseInt(props.newValue, 10);
                  }
                  break;
                case 'engineLevel':
                  dev[props.prop] = parseInt(props.newValue, 10);
                  break;
                case 'currentLampState':
                  propertie = dev[props.prop];
                  if (propertie[props.lamp - 1] === undefined) {
                    propertie[props.lamp - 1] = { lamp: props.lamp, state: props.newValue };
                  } else {
                    propertie[props.lamp - 1].state = props.newValue;
                  }
                  break;
                case 'currentLampValue':
                  propertie = dev[props.prop];
                  if (propertie[props.lamp - 1] === undefined) {
                    propertie[props.lamp - 1] = { lamp: props.lamp, value: props.newValue };
                  } else {
                    propertie[props.lamp - 1].value = props.newValue;
                  }
                  break;
                default:
                  console.log(`Can not parse stateChanged message with prop ${props.prop}`);
                  break;
              }
              return dev;
            }
            return false;
          });
          // console.log('Device that changed:', d);
        });

        socket.on('group_stateChanged', (props) => {
          console.log('Event: group_stateChanged', props);

          this.$dataStore.groups.filter((group) => {
            if (group.id === props.id) {
              const grp = group;
              switch (props.prop) {
                case 'name':
                  grp[props.prop] = `${props.newValue}`;
                  break;
                case 'engineState':
                  grp[props.prop] = (`${props.newValue}` === 'true');
                  break;
                case 'eventMode':
                  grp[props.prop] = (`${props.newValue}` === 'true');
                  break;
                case 'engineLevel':
                  grp[props.prop] = parseInt(props.newValue, 10);
                  break;
                default:
                  console.log(`Can not parse stateChanged message with prop ${props.prop}`);
                  break;
              }
              return grp;
            }
            return false;
          });
        });

        socket.on('group_devicesWithOtherStateChanged', (props) => {
          console.log('Event: group_devicesWithOtherStateChanged', props);

          this.$dataStore.groups.filter((group) => {
            if (group.id === props.id) {
              const grp = group;
              switch (props.prop) {
                case 'engineStateDevicesWithOtherState':
                  grp.engineStateDevicesWithOtherState = props.newValue;
                  break;
                case 'eventModeDevicesWithOtherState':
                  grp.eventModeDevicesWithOtherState = props.newValue;
                  break;
                case 'engineLevelDevicesWithOtherState':
                  grp.engineLevelDevicesWithOtherState = props.newValue;
                  break;
                default:
                  console.log(`Can not parse stateChanged message with prop ${props.prop}`);
                  break;
              }
              return grp;
            }
            return false;
          });
        });

        try {
          await this.fetchDataFromServer();
          this.socket = (this.$dataStore.user.userrole.rules.canChangeProperties.allowed)
            ? socket : null;
        } catch (error) {
          console.error('error in backend', error);
          Vue.$toast.open({
            type: 'error',
            message: `Server Error: ${error.message}`,
            duration: 5000,
          });
        }
      },
      methods: {
        async fetchDataFromServer() {
          await fetch('/api/devices')
            .then((response) => {
              if (response.status === 500) {
                throw new Error('Database not connected or database error');
              }
              return response.json();
            })
            .then((data) => {
              this.$dataStore.devices = data;
            });

          await fetch('/api/groups')
            .then((response) => {
              if (response.status === 500) {
                throw new Error('Database not connected or database error');
              }
              return response.json();
            })
            .then((data) => {
              this.$dataStore.groups = data;
            });
        },
        async getUsers() {
          try {
            const response = await fetch(`/api/users?user=${this.$dataStore.user.username}`);
            if (response.status === 404) {
              throw new Error('No data avalaible');
            }
            this.errorMessage = '';
            return response.json();
          } catch (error) {
            console.error(error);
          }
          return [];
        },
        async getUserroles() {
          try {
            const response = await fetch(`/api/userroles?user=${this.$dataStore.user.username}`);
            if (response.status === 404) {
              throw new Error('No data avalaible');
            }
            this.errorMessage = '';
            return response.json();
          } catch (error) {
            console.error(error);
          }
          return [];
        },
        async getUserroleRights() {
          try {
            const response = await fetch(`/api/userrolerights?user=${this.$dataStore.user.username}`);
            if (response.status === 404) {
              throw new Error('No data avalaible');
            }
            this.errorMessage = '';
            return response.json();
          } catch (error) {
            console.error(error);
          }
          return [];
        },
      },
    }).$mount('#app');
  })
  .catch((err) => {
    console.error(err);
  });
