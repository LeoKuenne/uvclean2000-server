<template>
  <div
    v-show="show" @click="close"
    class="fixed top-0 left-0 h-full w-full
    bg-black bg-opacity-50 flex justify-center items-center"
    >
    <form @submit="submit($event)"
      class="flex flex-col w-11/12 max-w-3xl text-color space-y-2 whitespace-nowrap bg-white
        p-5 rounded"
      @click.stop>
      <h1 class="text-xl font-bold">{{ title }}</h1>
      <h1 class="font-bold pb-5 text-red-500 whitespace-pre-line"
        :class="[(errorMessage !== '') ? 'visible' : 'hidden']">
        Error: {{ errorMessage }}
      </h1>
      <slot></slot>
    </form>
  </div>
</template>
<script>
export default {
  name: 'FormUVC',
  props: ['title', 'show', 'errorMessage'],
  methods: {
    close() {
      this.$emit('close');
    },
    submit(event) {
      event.preventDefault();
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
