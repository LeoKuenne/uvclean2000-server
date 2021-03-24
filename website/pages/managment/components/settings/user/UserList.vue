<template>
  <div>
    <div class="flex items-center space-x-5">
      <h2 class="text-lg font-bold">Users</h2>
      <button
        v-if="$dataStore.user.userrole.canChangeProperties"
        @click="showUserAddForm"
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
      <h2 class="font-bold text-lg">Userrights</h2>
      <div class="flex items-center">
        <label for="form_userrole.canChangeProperties">Can edit:</label>
        <input id="form_userrole.canChangeProperties"
          v-model="formUser.userrole.canChangeProperties"
          :checked="formUser.userrole.canChangeProperties"
          type="checkbox"
          class="rounded ml-2 border border-gray-500">
      </div>
      <div class="">
        <button
          class="float-left p-2 font-semibold hover:transform hover:scale-105 transition-all
          text-red-500"
          v-show="isFormEdit"
          :disabled="!isFormEdit"
          @click="deleteUser(formUser.userrole.canChangeProperties)">
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
      users: [],
      formUser: {
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
        userrole: {
          canChangeProperties: false,
        },
      };
      this.isFormEdit = true;
      this.showUserForm = true;
    },
    showUserAddForm() {
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
    deleteUser() {
      this.showUserForm = false;
      if (this.$root.$data.socket === null) return;
      this.$root.$data.socket.emit('user_delete', {
        username: this.formUser.username,
      });
    },
    addUser(user) {
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
      this.showUserForm = false;

      if (this.$root.$data.socket === null) return;
      this.$root.$data.socket.emit('user_add', {
        username: user.username,
        password: user.password,
      });
    },
    updateUser() {
      this.errorMessage = '';
      this.showUserForm = false;

      if (this.$root.$data.socket === null) return;
      this.$root.$data.socket.emit('user_update', {
        username: this.formUser.username,
        newUsername: this.formUser.newUsername,
        password: this.formUser.password,
      });
    },
    changeUserPassword(user) {
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

      if (user.newPassword.length <= 5 || user.newPassword !== user.newPasswordrepeat) {
        this.errorMessage = 'Passwords do not match';
        return;
      }

      this.showChangePasswordForm = false;

      if (this.$root.$data.socket === null) return;
      this.$root.$data.socket.emit('user_updatePassword', {
        username: user.username,
        oldPassword: user.oldPassword,
        newPassword: user.newPassword,
      });
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
  created() {
    fetch('/api/users')
      .then((response) => {
        if (response.status === 404) {
          throw new Error('No data avalaible');
        }
        this.errorMessage = '';
        return response.json();
      })
      .then((response) => {
        this.$dataStore.users = response;
      })
      .catch((err) => {
        console.error(err);
      });
  },

};
</script>
