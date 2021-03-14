<template>
  <div
    v-show="show" @click="close"
    class="fixed top-0 left-0 h-full w-full
    bg-black bg-opacity-50 flex justify-center items-center"
    >
    <form @submit="submit($event)"
      class="flex flex-col w-11/12 max-w-3xl text-color space-y-2 bg-white
        p-5 rounded"
      @click.stop>
      <h1 class="font-bold pb-5 text-primary text-center">
        {{ message }}
      </h1>
      <div class="w-full">
        <div class="flex justify-around space-x-2">
          <button
            @click="$emit('yesClicked')"
            class="font-semibold p-2 hover:transform hover:scale-105 transition-all
              bg-primary text-white w-28">
            Yes
          </button>
          <button
            @click="$emit('noClicked'); close();"
            class="font-semibold p-2 hover:transform hover:scale-105 transition-all
              bg-primary text-white w-28">
            No
          </button>
        </div>
      </div>
    </form>
  </div>
</template>
<script>
export default {
  name: 'ConfirmPrompt',
  data() {
    return {
      message: '',
      show: false,
    };
  },
  methods: {
    close() {
      this.$emit('close');
    },
    submit(event) {
      event.preventDefault();
    },
    async open(message) {
      this.show = true;
      this.message = message;
      return new Promise((res, rej) => {
        this.$on('yesClicked', () => { this.show = false; res(); });
        this.$on('noClicked', () => { this.show = false; rej(); });
      });
    },
  },
  mounted() {
    this.$emit('mounted');
    document.addEventListener('keydown', (e) => {
      if (this.show && e.keyCode === 27) {
        this.close();
      }
    });
  },

};
</script>
