<template>
  <div>
    <div class="flex items-center space-x-5">
      <h2 class="text-lg font-bold">General settings</h2>
    </div>
    <div class="max-w-2xl md:mt-10">
      <div class="relative bg-gray-100">
        <span class="absolute font-bold w-full h-full text-red-500 text-center italic">
          Deprecated
        </span>
        <div class="flex justify-between p-2">
          <div>
            <h3 class="text-base font-bold">Default engine Level</h3>
            <span class="text-xs">Is automatically send after the device is turned on</span>
          </div>
          <select
            class="p-2 m-2 border border-gray-300 rounded w-24"
            disabled
            @change="setEngineLevel($event.target.value)"
            :value="$dataStore.settings.defaultEngineLevel">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>
<script>

export default {
  name: 'GeneralSettings',
  components: {
  },
  data() {
    return {
    };
  },
  methods: {
    setEngineLevel(level) {
      fetch(`/api/settings?user=${this.$dataStore.user.username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          engineLevel: level,
        }),
      }).then(async (response) => {
        if (response.status === 401) {
          const error = await response.json();
          throw new Error(error.msg);
        }
        return response.json;
      }).catch((error) => {
        this.message = error;
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
  beforeCreate() {
    fetch('/api/settings')
      .then((response) => {
        if (response.status === 404) {
          throw new Error('No data available');
        }
        this.errorMessage = '';
        return response.json();
      })
      .then((response) => {
        console.log(response);
        this.$dataStore.settings = response;
      })
      .catch((err) => {
        console.error(err);
      });
  },

};
</script>
