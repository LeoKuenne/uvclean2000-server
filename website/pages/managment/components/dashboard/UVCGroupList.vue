<template>
  <div class="p-5 overflow-auto" id="groups">
    <div class="flex items-center space-x-5">
      <h2 class="text-lg font-bold">Groups</h2>
      <button
        v-if="$dataStore.user.userrole.rules.canChangeProperties.allowed"
        @click="showAddForm"
        class="flex text-left text-primary bg-white shadow items-center p-2
        hover:text-gray-600 hover:transform hover:scale-105
          hover:font-semibold transition-all">
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-5 h-5 mr-2" viewBox="0 0 16 16">
          <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2
            0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
          <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1
            0-1h3v-3A.5.5 0 0 1 8 4z"/>
        </svg>
        Add UVClean Group
      </button>
    </div>
    <router-link to="groups"
      class="cursor-default flex flex-wrap items-start justify-center"
      tag="div"
      @click="$route.query.group=''">
      <UVCGroup
        @edit="editGroup($event)"
        @setDevices="setDevicesInGroup($event)"
        @changeState="changeGroupState($event)"
        v-for="grp in $dataStore.groups"
        :key="grp.id"
        :group="grp"
        :ref="'group' + grp.id"
        :class="[(group === grp.id) ? 'transform scale-105': '']"
        class="m-5 w-80 border-primary border shadow-lg duration-200">
      </UVCGroup>
    </router-link>
    <UVCForm
      :title="heading"
      :show="showEditForm"
      :errorMessage="errorMessage"
      :isEdit="isFormEdit"
      @close="closeAddForm"
      @update="updateGroup(formGroup)"
      @delete="deleteGroup(formGroup)"
      @add="addGroup(formGroup)">
      <div class="">
        <label for="add_groupname">Group Name</label>
        <input id="add_groupname"
          v-bind:value="formGroup.name"
          @input="formGroup.name = $event.target.value"
          type="text"
          placeholder="Dach"
          class="block rounded p-2 border border-gray-500 mb-4 w-full">
        <label v-if="isFormEdit" for="add_groupid">Group ID</label>
        <input v-if="isFormEdit" id="add_groupid"
          v-bind:value="formGroup.id"
          v-bind:disabled="isFormEdit"
          @input="formGroup.id = $event.target.value"
          type="text"
          placeholder="123456789"
          class="block rounded p-2 border border-gray-500 mb-4 w-full">
      </div>
    </UVCForm>
    <UVCForm
      :title="'Set Devices in Group'"
      :show="showSetDeviceForm"
      :errorMessage="errorMessage"
      :confirmText="'Set'"
      @close="closeSetDeviceForm"
      @add="setDevices">
      <h2>Group: {{ formGroup.name }}</h2>
      <div class="flex-grow p-2 bg-white border border-gray-400 rounded">
        <div class="space-x-2"
          v-for="device in $root.$dataStore.devices"
          :key="device.serialnumber">
          <input
            type="checkbox"
            :id="'setDevice' + device.serialnumber"
            :value="device.serialnumber"
            :checked="device.group.name === formGroup.name"
            v-model="checkedDevices">
          <label class="select-none"
           :for="'setDevice' + device.serialnumber">
            {{device.name}}
          </label>
          <label class="italic select-none" v-if="device.group.name"
            :for="'setDevice' + device.serialnumber">
            ({{device.group.name}})
          </label>
        </div>
      </div>
    </UVCForm>
    <ConfirmPrompt
      ref="confirmPrompt">
    </ConfirmPrompt>
  </div>
</template>
<script>
import UVCGroup from './UVCGroup.vue';
import UVCForm from '../UVCForm.vue';
import ConfirmPrompt from '../ConfirmPrompt.vue';

export default {
  name: 'UVCGroupList',
  components: {
    UVCGroup,
    UVCForm,
    ConfirmPrompt,
  },
  props: ['group'],
  computed: {
    okProp() {
      return this.isFormEdit ? 'Update' : 'Add';
    },
    heading() {
      return this.isFormEdit ? 'Update Group' : 'Add Group';
    },
  },
  watch: {
    group() {
      if (this.group !== undefined && this.group.match(/[0-9a-z]/gm)) {
        this.scrollToElement(this.group);
      }
    },
  },
  mounted() {
    this.$nextTick(() => {
      if (this.group !== undefined && this.group.match(/[0-9a-z]/gm)) {
        this.scrollToElement(this.group);
      }
    });
  },
  methods: {
    /**
     * Called when the close button is pressed on the addDevice form
     */
    closeSetDeviceForm() {
      this.showSetDeviceForm = false;
    },
    /**
     * Called if the group is selected in the query
     */
    scrollToElement(group) {
      const element = this.$refs[`group${group}`];
      if (element && element[0]) {
        element[0].$el.scrollIntoView({ behavior: 'smooth' });
      }
    },
    showAddForm() {
      this.formGroup = {
        name: '',
        id: '',
      };
      this.isFormEdit = false;
      this.showEditForm = true;
    },
    /**
     * Called by the close events from the modal
     */
    closeAddForm() {
      this.showEditForm = false;
      this.formGroup = {
        name: '',
        id: '',
      };
      this.errorMessage = '';
    },
    addGroup(group) {
      if (group.name === '' || group.name.match(/[^0-9A-Za-z+ ]/gm) !== null) {
        this.errorMessage = `Name has to be vaild. Only numbers, letters and "+" are allowed.\n Invalid characters: ${group.name.match(/[^0-9A-Za-z+ ]/gm).join(',')}`;
        return;
      }

      this.showEditForm = false;
      this.errorMessage = '';

      if (this.$root.$data.socket === null) return;
      this.$root.$data.socket.emit('group_add', {
        name: group.name,
      });
    },
    /**
     *
     */
    setDevices() {
      if (this.formGroup.name === '' || this.formGroup.name.match(/[^0-9A-Za-z+ ]/gm) !== null) {
        this.errorMessage = 'Name has to be vaild.';
        return;
      }

      this.showSetDeviceForm = false;

      if (this.$root.$data.socket === null) return;
      this.$root.$data.socket.emit('group_setDevices', {
        group: this.formGroup.id,
        devices: this.checkedDevices,
      });
    },
    /**
     * Called when the assign button of the group form is clicked
     */
    setDevicesInGroup(group) {
      this.formGroup = {
        name: group.name,
        id: group.id,
      };
      this.checkedDevices = [];
      group.devices.map((device) => {
        this.checkedDevices.push(device.serialnumber);
        return device;
      });
      this.showSetDeviceForm = true;
    },
    editGroup(group) {
      this.formGroup = {
        name: group.name,
        id: group.id,
      };
      this.isFormEdit = true;
      this.showEditForm = true;
    },
    updateGroup(group) {
      if (group.name === '' || group.name.match(/[^0-9A-Za-z+ ]/gm) !== null) {
        this.errorMessage = `Name has to be vaild. Only numbers, letters and "+" are allowed.\n Invalid characters: ${group.name.match(/[^0-9A-Za-z+ ]/gm).join(',')}`;
        return;
      }

      this.showEditForm = false;
      this.errorMessage = '';

      if (this.$root.$data.socket === null) return;
      this.$root.$data.socket.emit('group_changeState', {
        id: group.id,
        prop: 'name',
        newValue: group.name,
      });
    },
    async deleteGroup(group) {
      this.showEditForm = false;
      await this.$refs.confirmPrompt.open(`Do you really want to delete group "${group.name}"?`).then(() => {
        if (this.$root.$data.socket === null) return;
        this.$root.$data.socket.emit('group_delete', { id: group.id });
      }).catch(() => {});
    },
    /**
     * Called when any state in the devices should be changed
     */
    changeGroupState(newState) {
      if (newState.id === undefined
        || newState.prop === undefined
        || newState.newValue === undefined) {
        console.log('New State can not be parsed', newState);
        return;
      }
      if (this.$root.$data.socket === null) return;
      this.$root.$data.socket.emit('group_changeState', {
        id: newState.id,
        prop: newState.prop,
        newValue: `${newState.newValue}`,
      });
    },
  },
  data() {
    return {
      showSetDeviceForm: false,
      checkedDevices: [],
      showEditForm: false,
      isFormEdit: false,
      errorMessage: '',
      formGroup: {
        name: '',
        id: '',
      },
    };
  },
};
</script>

<style>
.smooth-enter-active,
.smooth-leave-active {
  @apply duration-200;
  @apply ease-in-out;
}

.smooth-enter-to, .smooth-leave {
}

.smooth-enter, .smooth-leave-to {
}
</style>
