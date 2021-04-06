<template>
  <transition name="formAppearOpacity">
    <div
      v-show="show" @click="close"
      class="fixed top-0 left-0 h-full w-full z-20
      bg-black bg-opacity-50 flex justify-center items-center"
      >
      <transition name="formAppearScale">
        <form @submit="submit($event)"
          class="z-20 fixed flex flex-col w-full h-full justify-center items-center
            sm:w-11/12 sm:max-w-3xl sm:h-auto text-color space-y-2 whitespace-nowrap bg-white p-3
            rounded"
          @click.stop>
          <div class="flex flex-col w-5/6">
            <h1 class="text-xl font-bold pb-5 pt-2">{{ title }}</h1>
            <h1 class="font-bold pb-5 text-red-500 whitespace-pre-line"
              :class="[(errorMessage !== '') ? 'visible' : 'hidden']">
              Error: {{ errorMessage }}
            </h1>
            <slot></slot>
            <div class="inline-block float-left w-full mt-3">
              <button
                @click="$emit('delete')"
                class="float-left p-2 font-semibold hover:transform hover:scale-105 transition-all
                text-red-500"
                v-show="isEdit">
                {{deleteText}}
              </button>
              <div class="float-right space-x-2">
                <button
                  @click="(isEdit) ? $emit('update') : $emit('add')"
                  class="font-semibold p-2 hover:transform hover:scale-105 transition-all
                  bg-primary text-white">
                  {{okProp}}
                </button>
                <button
                  @click="$emit('close')"
                  class="font-semibold hover:transform hover:scale-105 transition-all">
                  Close
                </button>
              </div>
            </div>
          </div>
        </form>
      </transition>
    </div>
  </transition>
</template>
<script>
export default {
  name: 'FormUVC',
  props: {
    title: {
      type: String,
      default: '',
    },
    show: {
      type: Boolean,
      default: false,
    },
    errorMessage: {
      type: String,
      default: '',
    },
    isEdit: {
      type: Boolean,
      default: false,
    },
    confirmText: {
      type: String,
      default: 'Add',
    },
    confirmEditText: {
      type: String,
      default: 'Update',
    },
    deleteText: {
      type: String,
      default: 'Delete',
    },
  },
  methods: {
    close() {
      this.$emit('close');
    },
    submit(event) {
      event.preventDefault();
    },
  },
  computed: {
    okProp() {
      return (!this.isEdit) ? this.confirmText : this.confirmEditText;
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

<style>
.formAppearScale-enter-active,
.formAppearScale-leave-active,
.formAppearOpacity-enter-active,
.formAppearOpacity-leave-active {
  @apply duration-200;
  @apply ease-in-out;
}

.formAppearOpacity-enter-to, .formAppearOpacity-leave {
  @apply transform;
  @apply opacity-100;
}

.formAppearOpacity-enter, .formAppearOpacity-leave-to {
  @apply transform;
  @apply opacity-0;
}

.formAppearScale-enter-to, .formAppearScale-leave {
  @apply transform;
  @apply scale-100;
}

.formAppearScale-enter, .formAppearScale-leave-to {
  @apply transform;
  @apply scale-50;
}
</style>
