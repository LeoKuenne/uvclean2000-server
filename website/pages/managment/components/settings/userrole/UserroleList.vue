<template>
  <div>
    <div class="flex items-center space-x-5">
      <h2 class="text-lg font-bold">Userroles</h2>
      <button
        v-if="$dataStore.user.userrole.rules.canEditUserrole.allowed"
        @click="showUserroleAddForm"
        class="flex text-left text-primary bg-white shadow items-center p-2
        hover:text-gray-500 hover:transform hover:scale-105
          hover:font-semibold transition-all">
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-5 h-5 mr-2" viewBox="0 0 16 16">
          <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2
            0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
          <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1
            0-1h3v-3A.5.5 0 0 1 8 4z"/>
        </svg>
        Add Userrole
      </button>
    </div>
    <userrole
      v-for="userrole in $dataStore.userroles" :key="userrole.name"
      :userrole="userrole"
      @editUserrole="editUserrole($event)"
      >
    </userrole>
    <UVCForm
      :title="heading"
      :show="showUserListForm"
      :errorMessage="errorMessage"
      @close="closeUserForm">
      <label for="form_userrolename">Name</label>
      <input id="form_userrolename"
        :value="formUserrole.name"
        @input="(isFormEdit) ?
          formUserrole.newName = $event.target.value
          : formUserrole.name = $event.target.value"
        type="text"
        placeholder="Technician"
        class="rounded p-2 border border-gray-500 mb-4">
      <div class="flex w-full">
        <div class="w-1/2">
          <h2 class="font-bold text-lg">Userrights</h2>
          <div class="flex flex-col space-y-2 m-2">
            <div class="space-x-2 text-sm flex items-center"
              v-for="rule in $dataStore.userroleRights" :key="rule.propertie">
              <input type="checkbox" :id="'cbxuserrole' + rule.propertie" :value="rule.propertie"
                :checked="rule.allowed" v-model="formUserrole.rules[rule.propertie]">
              <label :for="'cbxuserrole' + rule.propertie">{{rule.description}}</label>
            </div>
          </div>
        </div>
        <div class="w-1/2">
          <h2 class="font-bold text-lg whitespace-normal">
            Can be edited by
          </h2>
          <div class="flex flex-col space-y-2 m-2">
            <div class="space-x-2 text-sm flex items-center"
              v-for="role in $dataStore.userroles.filter((r) => r.name !== formUserrole.name)"
                :key="role.name">
              <input type="checkbox" :id="'cbxuserrole' + role.name" :value="role.name"
                v-model="formUserrole.newcanBeEditedByUserrole">
              <label :for="'cbxuserrole' + role.name">{{role.name}}</label>
            </div>
          </div>
        </div>
      </div>
      <div class="">
        <button
          class="float-left p-2 font-semibold hover:transform hover:scale-105 transition-all
          text-red-500"
          v-show="isFormEdit"
          :disabled="!isFormEdit"
          @click="deleteUserrole(formUserrole)">
          Delete
        </button>
        <div class="float-right space-x-2">
          <button class="font-semibold p-2 hover:transform hover:scale-105 transition-all
            bg-primary text-white"
            @click="(isFormEdit) ? updateUser(formUserrole) : addUserrole(formUserrole)">
            {{okProp}}
          </button>
          <button class="font-semibold p-2 hover:transform hover:scale-105 transition-all"
            @click="closeUserForm">
            Close
          </button>
        </div>
      </div>
    </UVCForm>
  </div>
</template>
<script>
import Userrole from './Userrole.vue';
import UVCForm from '../../UVCForm.vue';

export default {
  name: 'UserroleList',
  components: {
    Userrole,
    UVCForm,
  },
  data() {
    return {
      formUserrole: {
        name: '',
        rules: {},
        canBeEditedByUserrole: [],
      },
      isFormEdit: false,
      showUserListForm: false,
      errorMessage: '',
    };
  },
  methods: {
    isIncanBeEditedByUserrole(isRole, inRole) {
      return (isRole.name === inRole.name) ? true
        : inRole.canBeEditedByUserrole.filter(
          (userroleCanEdit) => userroleCanEdit.name === isRole.name,
        ).length === 1;
    },
    editUserrole(userrole) {
      this.errorMessage = '';
      console.log(userrole);
      this.formUserrole = {
        name: userrole.name,
        rules: {},
        canBeEditedByUserrole: [],
        newcanBeEditedByUserrole: [],
      };
      this.$dataStore.userroleRights.forEach((rule) => {
        this.formUserrole.rules[rule.propertie] = userrole.rules[rule.propertie].allowed;
      });
      userrole.canBeEditedByUserrole.forEach((role) => {
        this.formUserrole.newcanBeEditedByUserrole.push(role.name);
      });
      this.isFormEdit = true;
      this.showUserListForm = true;
    },
    showUserroleAddForm() {
      this.errorMessage = '';
      this.formUserrole = {
        name: '',
        rules: {},
        newcanBeEditedByUserrole: [this.$dataStore.user.userrole.name],
      };
      this.$dataStore.userroleRights.forEach((role) => {
        this.formUserrole.rules[role.propertie] = true;
      });
      this.isFormEdit = false;
      this.showUserListForm = true;
    },
    closeUserForm() {
      this.showUserListForm = false;
    },
    async deleteUserrole(user) {
      const response = await fetch('/api/deleteUserrole', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userrole: user.name }),
      });

      const json = await response.json();
      if (response.status !== 201) {
        this.errorMessage = json.msg;
        return;
      }

      this.$dataStore.userroles = await this.$root.getUserroles();
      this.showUserListForm = false;
      // if (this.$root.$data.socket === null) return;
      // this.$root.$data.socket.emit('user_delete', {
      //   name: this.formUserrole.name,
      // });
    },
    async addUserrole(userrole) {
      if (userrole.name.length <= 3 || userrole.name.match(/[^0-9A-Za-z+ ]/gm) !== null) {
        this.errorMessage = 'Username has to be vaild. Only numbers and letters are allowed.'
            + 'Provide at least 3 characters.\n';
        if (userrole.name.match(/[^0-9A-Za-z+#-.!&]/gm) !== null) {
          this.errorMessage += ` Invalid characters: '
              + '${userrole.name.match(/[^0-9A-Za-z+ ]/gm).join(',')}`;
        }
        return;
      }

      const fetchObject = {
        userrole: userrole.name,
        canBeEditedByUserrole: userrole.newcanBeEditedByUserrole,
      };
      this.$dataStore.userroleRights.forEach((role) => {
        fetchObject[role.propertie] = userrole.rules[role.propertie];
      });

      console.log(fetchObject);

      const response = await fetch('/api/createUserrole', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fetchObject),
      });

      const json = await response.json();
      if (response.status !== 201) {
        this.errorMessage = json.msg;
        return;
      }

      this.$dataStore.userroles = await this.$root.getUserroles();
      this.showUserListForm = false;

      // if (this.$root.$data.socket === null) return;
      // this.$root.$data.socket.emit('user_add', {
      //   username: user.username,
      //   password: user.password,
      // });
    },
    async updateUser(userrole) {
      let action = 'changeRights';

      const fetchObject = {
      };

      if (userrole.newName !== undefined) {
        if (userrole.newName.length <= 3 || userrole.newName.match(/[^0-9A-Za-z+ ]/gm) !== null) {
          this.errorMessage = 'Username has to be vaild. Only numbers and letters are allowed.'
            + 'Provide at least 3 characters.\n';
          if (userrole.newName.match(/[^0-9A-Za-z+#-.!&]/gm) !== null) {
            this.errorMessage += ` Invalid characters: '
              + '${userrole.newName.match(/[^0-9A-Za-z+ ]/gm).join(',')}`;
          }
          return;
        }

        fetchObject.name = userrole.newName;
        action = 'changeName';
      } else {
        fetchObject.userrole = userrole.name;
        fetchObject.canBeEditedByUserrole = userrole.newcanBeEditedByUserrole;
        this.$dataStore.userroleRights.forEach((role) => {
          fetchObject[role.propertie] = userrole.rules[role.propertie];
        });
      }

      console.log(fetchObject);

      const response = await fetch(`/api/updateUserrole?action=${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fetchObject),
      });

      const json = await response.json();
      console.log(json);
      if (response.status !== 201) {
        this.errorMessage = json.msg;
        return;
      }

      this.$dataStore.userroles = await this.$root.getUserroles();
      this.$dataStore.user = await this.$root.getUser();
      this.showUserListForm = false;

      // this.errorMessage = '';
      // this.showUserListForm = false;

      // if (this.$root.$data.socket === null) return;
      // this.$root.$data.socket.emit('user_update', {
      //   username: this.formUserrole.username,
      //   newUsername: this.formUserrole.newUsername,
      //   password: this.formUserrole.password,
      // });
    },
  },
  computed: {
    heading() {
      return this.isFormEdit ? 'Edit Userrole' : 'Add Userrole';
    },
    okProp() {
      return (this.isFormEdit) ? 'Update' : 'Add';
    },
  },
  async created() {
    this.$dataStore.userroles = await this.$root.getUserroles();
    this.$dataStore.userroleRights = await this.$root.getUserroleRights();
  },

};
</script>
