<template>
  <div class="flex flex-col xl:flex-row h-full w-full overflow-y-auto">
    <user-list class="w-full xl:w-1/2"></user-list>
    <userrole-list class="w-full xl:w-1/2"></userrole-list>
  </div>
</template>
<script>
import UserList from './user/UserList.vue';
import UserroleList from './userrole/UserroleList.vue';

export default {
  components: {
    UserList,
    UserroleList,
  },

};
</script>
