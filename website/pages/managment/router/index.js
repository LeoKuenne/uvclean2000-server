import Vue from 'vue';
import VueRouter from 'vue-router';
import DashboardView from '../views/Dashboard.vue';
import ChartView from '../views/Chart.vue';
import SettingsView from '../views/Settings.vue';
// import Login from '../views/Login.vue';
import DeviceChart from '../components/diagram/DeviceChart.vue';
import GroupChart from '../components/diagram/GroupChart.vue';
import UVCDeviceList from '../components/dashboard/UVCDeviceList.vue';
import UVCGroupList from '../components/dashboard/UVCGroupList.vue';
import UserList from '../components/settings/user/UserList.vue';
import GeneralSettings from '../components/settings/GeneralSettings.vue';

Vue.use(VueRouter);

const routes = [
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView,
    props(route) {
      return route.query || {};
    },
    children: [
      {
        name: 'devices',
        path: 'devices',
        component: UVCDeviceList,
        props(route) {
          return route.query || {};
        },
      },
      {
        name: 'groups',
        path: 'groups',
        component: UVCGroupList,
        props(route) {
          return route.query || {};
        },
      },
    ],
    // meta: {
    //   requiresAuth: true,
    // },
  },
  {
    path: '/chart',
    name: 'chart',
    component: ChartView,
    children: [
      {
        path: 'device',
        name: 'DeviceChart',
        component: DeviceChart,
        props(route) {
          return route.query || {};
        },
      },
      {
        path: 'group',
        name: 'GroupChart',
        component: GroupChart,
        props(route) {
          return route.query || {};
        },
      },
    ],
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    children: [
      {
        path: 'user',
        name: 'settingsUserList',
        component: UserList,
        props(route) {
          return route.query || {};
        },
      },
      {
        path: 'general',
        name: 'settingsGeneral',
        component: GeneralSettings,
        props(route) {
          return route.query || {};
        },
      },
    ],
  },
];

const router = new VueRouter({
  // mode: 'history',
  routes,
});

// router.replace('/chart');

// router.beforeEach((to, from, next) => {
//   if (to.matched.some((record) => record.meta.requiresAuth)) {
//     if (localStorage.getItem('jwt') == null) {
//       next({
//         path: '/login',
//         params: { nextUrl: to.fullPath },
//       });
//     } else {
//       const user = JSON.parse(localStorage.getItem('user'));
//       if (to.matched.some((record) => record.meta.is_admin)) {
//         if (user.is_admin === 1) {
//           next();
//         } else {
//           next({ name: 'userboard' });
//         }
//       } else {
//         next();
//       }
//     }
//   } else if (to.matched.some((record) => record.meta.guest)) {
//     if (localStorage.getItem('jwt') == null) {
//       next();
//     } else {
//       next({ name: 'userboard' });
//     }
//   } else {
//     next();
//   }
// });

export default router;
