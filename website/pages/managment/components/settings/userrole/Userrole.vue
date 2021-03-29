<template>
  <div class="m-2 flex border border-gray-300 rounded overflow-hidden shadow-sm">
    <div class="w-24 flex items-center justify-center bg-primary text-white">
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="h-16 w-16" viewBox="0 0 16 16">
        <path d="M6.5 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3zM11 8a3 3 0 1 1-6 0 3 3 0 0 1
          6 0z"/>
        <path d="M4.5 0A2.5 2.5 0 0 0 2 2.5V14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2.5A2.5 2.5
          0 0 0 11.5 0h-7zM3 2.5A1.5 1.5 0 0 1 4.5 1h7A1.5 1.5 0 0 1 13 2.5v10.795a4.2 4.2
          0 0 0-.776-.492C11.392 12.387 10.063 12 8 12s-3.392.387-4.224.803a4.2 4.2 0 0
          0-.776.492V2.5z"/>
      </svg>
    </div>
    <div class="w-full p-2">
      <div class="flex items-center justify-between pb-4">
        <h1 class="font-bold text-lg">Userrole: {{ userrole.name }}</h1>
        <div class="flex space-x-2 m-2">
          <button v-if="canLoggedInUserEdit"
           @click="$emit('editUserrole', userrole)">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-5 h-5 text-black" viewBox="0 0 16 16">
              <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707
                0l1.293 1.293zm-1.75 2.456l-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25
                0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
              <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0
                1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5
                0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
            </svg>
          </button>
          <!-- <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-5 h-5 text-black" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1
            .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0
              1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0
              1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5
              3V2h11v1h-11z"/>
          </svg> -->
        </div>
      </div>
      <div class="flex flex-col sm:flex-row">
        <div>
          <h2 class="font-bold text-base">Rights:</h2>
          <div class="flex flex-col space-y-2 m-2">
            <div class="space-x-2 text-sm flex items-center"
              v-for="rule in userrole.rules" :key="rule.description">
              <input type="checkbox" :id="'cbxuserrole' + rule.description"
                disabled :checked="rule.allowed">
              <label :for="'cbxuserrole' + rule.description">{{rule.description}}</label>
            </div>
          </div>
        </div>
        <div>
          <h2 class="font-bold text-base">Can be edited by:</h2>
          <div class="flex flex-col space-y-2 m-2">
            <div class=" space-x-2 text-sm flex items-center"
              v-for="role in $dataStore.userroles.filter((r) => r.name !== userrole.name)"
                :key="role.name">
              <input type="checkbox" :id="'cbxuserrole' + role.name"
                disabled :checked="isIncanBeEditedByUserrole(role)">
              <label :for="'cbxuserrole' + role.name">{{role.name}}</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  name: 'Userrole',
  props: {
    userrole: Object,
  },
  computed: {
    canLoggedInUserEdit() {
      if (!this.$dataStore.user.userrole.rules.canEditUserrole.allowed) return false;
      if (this.userrole.canBeEditedByUserrole.filter(
        (userroleCanBeEditedBy) => userroleCanBeEditedBy.name
          === this.$dataStore.user.userrole.name,
      ).length === 1 || this.$dataStore.user.userrole.name === this.userrole.name) return true;
      return false;
    },
  },
  methods: {
    isIncanBeEditedByUserrole(role) {
      return this.userrole.canBeEditedByUserrole.filter(
        (userroleCanEdit) => userroleCanEdit.name === role.name,
      ).length === 1;
    },
  },
};
</script>
