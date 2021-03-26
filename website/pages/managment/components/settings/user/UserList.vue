<template>
  <div>
    <div class="flex items-center space-x-5">
      <h2 class="text-lg font-bold">Users</h2>
      <button
        v-if="$dataStore.user.userrole.rules.canChangeProperties.allowed"
        @click="showUserAddForm()"
        class="flex text-left text-primary bg-white shadow items-center p-2
        hover:text-gray-500 hover:transform hover:scale-105
          hover:font-semibold transition-all">
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-5 h-5 mr-2" viewBox="0 0 16 16">
          <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2
            0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
          <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1
            0-1h3v-3A.5.5 0 0 1 8 4z"/>
        </svg>
        Add User
      </button>
    </div>
    <user
      v-for="user in $dataStore.users" :key="user.username"
      :user="user"
      @editUser="editUser($event)"
      >
    </user>
    <UVCForm
      :title="heading"
      :show="showUserForm"
      :errorMessage="errorMessage"
      @close="closeUserForm">
      <label for="form_username">Username</label>
      <input id="form_username"
        :value="formUser.username"
        @input="(isFormEdit) ?
          formUser.newUsername = $event.target.value : formUser.username = $event.target.value "
        type="text"
        placeholder="Max Mustermann"
        class="rounded p-2 border border-gray-500 mb-4">
      <div v-if="!isFormEdit"
        class="flex flex-col">
        <label for="form_password">Password</label>
        <input id="form_password"
          v-model="formUser.password"
          type="password"
          class="rounded p-2 border border-gray-500 mb-4">
        <label for="form_passwordrepeat">Password repeat</label>
        <input id="form_passwordrepeat"
          v-model="formUser.passwordrepeat"
          type="password"
          class="rounded p-2 border border-gray-500 mb-4">
      </div>
      <button v-else class="hover:underline"
        @click="showUserForm = false; showChangePasswordForm = true;">
        Change Password
      </button>
      <div class="flex w-full space-x-2 items-center">
        <h2 class="font-bold text-lg">Userrole:</h2>
        <select class="text-lg w-full p-2 border border-gray-300 rounded"
          :value="formUser.userrole"
          @change="formUser.userrole = $event.target.value">
          <option v-for="role in $dataStore.userroles" :key="role.name" :value="role.name">
            {{role.name}}
          </option>
        </select>
      </div>
      <div class="">
        <button
          class="float-left p-2 font-semibold hover:transform hover:scale-105 transition-all
          text-red-500"
          v-show="isFormEdit"
          :disabled="!isFormEdit"
          @click="deleteUser(formUser)">
          Delete
        </button>
        <div class="float-right space-x-2">
          <button class="font-semibold p-2 hover:transform hover:scale-105 transition-all
            bg-primary text-white"
            @click="(isFormEdit) ? updateUser(formUser) : addUser(formUser)">
            {{okProp}}
          </button>
          <button class="font-semibold p-2 hover:transform hover:scale-105 transition-all"
            @click="closeUserForm">
            Close
          </button>
        </div>
      </div>
    </UVCForm>
    <UVCForm
      title="Change Password"
      :show="showChangePasswordForm"
      :errorMessage="errorMessage"
      @close="closeUserForm">
      <label for="form_oldPassword">Old Password</label>
      <input id="form_oldPassword"
        v-model="formUser.oldPassword"
        type="password"
        class="rounded p-2 border border-gray-500 mb-4">
      <label for="form_newPassword">New Password</label>
      <input id="form_newPassword"
        v-model="formUser.newPassword"
        type="password"
        class="rounded p-2 border border-gray-500 mb-4">
      <label for="form_newPasswordrepeat">New Password repeat</label>
      <input id="form_newPasswordrepeat"
        v-model="formUser.newPasswordrepeat"
        type="password"
        class="rounded p-2 border border-gray-500 mb-4">
      <div class="">
        <div class="float-right space-x-2">
          <button class="font-semibold p-2 hover:transform hover:scale-105 transition-all
            bg-primary text-white"
            @click="changeUserPassword(formUser)">
            Change
          </button>
          <button class="font-semibold hover:transform hover:scale-105 transition-all"
            @click="closeUserForm">
            Close
          </button>
        </div>
      </div>
    </UVCForm>
  </div>
</template>
<script>
import User from './User.vue';
import UVCForm from '../../UVCForm.vue';

export default {
  name: 'UserList',
  components: {
    User,
    UVCForm,
  },
  data() {
    return {
      formUser: {
        username: '',
        userrole: {

        },
      },
      isFormEdit: false,
      showUserForm: false,
      showChangePasswordForm: false,
      errorMessage: '',
    };
  },
  methods: {
    editUser(user) {
      this.errorMessage = '';
      this.formUser = {
        username: user.username,
        newUsername: user.username,
        userrole: user.userrole.name,
      };
      this.isFormEdit = true;
      this.showUserForm = true;
    },
    async showUserAddForm() {
      this.errorMessage = '';
      this.formUser = {
        username: '',
        userrole: {
          canChangeProperties: false,
        },
      };
      this.isFormEdit = false;
      this.showUserForm = true;
    },
    closeUserForm() {
      this.showUserForm = false;
      this.showChangePasswordForm = false;
    },
    async deleteUser(user) {
      const response = await fetch(`/api/deleteUser?user=${this.$dataStore.user.username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
        }),
      });

      const json = await response.json();
      if (response.status !== 201) {
        this.errorMessage = json.msg;
        return;
      }

      this.$dataStore.users = await this.$root.getUsers();
      this.showUserForm = false;
      // if (this.$root.$data.socket === null) return;
      // this.$root.$data.socket.emit('user_delete', {
      //   username: this.formUser.username,
      // });
    },
    async addUser(user) {
      console.log(user);
      if (user.username.length <= 3 || user.username.match(/[^0-9A-Za-z+ ]/gm) !== null) {
        this.errorMessage = 'Username has to be vaild. Only numbers and letters are allowed. Provide at least 3 characters.\n';
        if (user.username.match(/[^0-9A-Za-z+#-.!&]/gm) !== null) this.errorMessage += ` Invalid characters: ${user.username.match(/[^0-9A-Za-z+ ]/gm).join(',')}`;
        return;
      }

      if (user.password.length <= 5 || user.password.match(/[^0-9A-Za-z+#-.!&]/gm) !== null) {
        this.errorMessage = 'Password has to be vaild. Only numbers, letters and +#-.!& are allowed. Provide at least 5 characters.\n';
        if (user.password.match(/[^0-9A-Za-z+#-.!&]/gm) !== null) this.errorMessage += ` Invalid characters: ${user.password.match(/[^0-9A-Za-z+#-.!&]/gm).join(',')}`;
        return;
      }

      if (user.password !== user.passwordrepeat) {
        this.errorMessage = 'Passwords do not match';
        return;
      }

      const response = await fetch(`/api/addUser?user=${this.$dataStore.user.username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          password: user.password,
          password_repeat: user.passwordrepeat,
          userrole: user.userrole,
        }),
      });

      const json = await response.json();
      if (response.status !== 201) {
        this.errorMessage = json.msg;
        return;
      }

      this.$dataStore.users = await this.$root.getUsers();
      this.showUserForm = false;
      // if (this.$root.$data.socket === null) return;
    },
    async updateUser(user) {
      this.errorMessage = '';
      this.showUserForm = false;

      const response = await fetch(`/api/updateUser?action=changeUserrole&user=${this.$dataStore.user.username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          newUserrole: user.userrole,
        }),
      });

      const json = await response.json();
      if (response.status !== 201) {
        this.errorMessage = json.msg;
        return;
      }

      this.$dataStore.users = await this.$root.getUsers();
      this.showUserForm = false;

      // if (this.$root.$data.socket === null) return;
      // this.$root.$data.socket.emit('user_update', {
      //   username: this.formUser.username,
      //   newUsername: this.formUser.newUsername,
      //   password: this.formUser.password,
      // });
    },
    async changeUserPassword(user) {
      this.errorMessage = '';

      if (user.oldPassword.length <= 5 || user.oldPassword === undefined) {
        this.errorMessage = 'Provide an old password which is longer than 5 characters';
        return;
      }

      if (user.newPassword.length <= 5 || user.newPassword.match(/[^0-9A-Za-z+#-.!&]/gm) !== null) {
        this.errorMessage = 'Password has to be vaild. Only numbers, letters and +#-.!& are allowed. Provide at least 5 characters. \n';
        if (user.newPassword.match(/[^0-9A-Za-z+#-.!&]/gm) !== null) this.errorMessage += `Invalid characters: ${user.newPassword.match(/[^0-9A-Za-z+#-.!&]/gm).join(',')}`;
        return;
      }

      if (user.newPasswordrepeat.length <= 5 || user.newPassword !== user.newPasswordrepeat) {
        this.errorMessage = 'Passwords do not match';
        return;
      }

      const response = await fetch(`/api/updateUser?action=changePassword&user=${this.$dataStore.user.username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          oldPassword: user.oldPassword,
          newPassword: user.newPassword,
          newPasswordRepeated: user.newPasswordrepeat,
        }),
      });

      const json = await response.json();
      if (response.status !== 201) {
        this.errorMessage = json;
        return;
      }

      // if (this.$root.$data.socket === null) return;
      // this.$root.$data.socket.emit('user_updatePassword', {
      //   username: user.username,
      //   oldPassword: user.oldPassword,
      //   newPassword: user.newPassword,
      // });
      this.showChangePasswordForm = false;
    },
  },
  computed: {
    heading() {
      return this.isFormEdit ? 'Edit User' : 'Add User';
    },
    okProp() {
      return (this.isFormEdit) ? 'Update' : 'Add';
    },
  },
  async beforeCreate() {
    this.$dataStore.users = await this.$root.getUsers();
  },

};
</script>
