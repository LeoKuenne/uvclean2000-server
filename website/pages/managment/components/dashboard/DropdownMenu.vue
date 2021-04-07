<template>
  <div class="relative"
      v-click-outside="dropdownOutsideClicked">
    <button
      @click="dropdownMenuClicked"
      class="w-full h-full hover:transform hover:scale-105 transition-all">
      <svg v-show="showIcon && !showDropdown"
        xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-6 h-6 text-white" viewBox="0 0 16 16">
        <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3
        0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
      </svg>
      <svg v-show="showIcon && showDropdown"
        xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-6 h-6 text-white" viewBox="0 0 16 16">
        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1
          .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646
          2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
      </svg>
      <slot></slot>
    </button>
    <div class="relative" @click.stop>
      <transition name="dropdownSlide">
        <div
          v-if="showDropdown"
          class="absolute right-0 bg-white rounded overflow-hidden shadow
            whitespace-nowrap text-right min-w-min">
          <button v-for="item in activeMenuItems"
            :key="item.text"
            class="hover:bg-gray-200 w-full p-2 block text-right"
            @click="$emit('itemClicked', item.text); showDropdown = false">
            {{item.text}}
          </button>
        </div>
      </transition>
    </div>
  </div>
</template>
<script>
import Vue from 'vue';

export default {
  name: 'DropdownMenu',
  props: ['menuItems', 'showIcon'],
  methods: {
    dropdownMenuClicked() {
      this.showDropdown = !this.showDropdown;
    },
    dropdownOutsideClicked() {
      this.showDropdown = false;
    },
  },
  data() {
    return {
      showDropdown: false,
    };
  },
  computed: {
    activeMenuItems() {
      return this.menuItems.filter((item) => item.disabled === false);
    },
  },
};

Vue.directive('click-outside', {
  bind(el, binding, vnode) {
    // eslint-disable-next-line no-param-reassign
    el.clickOutsideEvent = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        vnode.context[binding.expression](event);
      }
    };
    document.body.addEventListener('click', el.clickOutsideEvent);
  },
  unbind(el) {
    document.body.removeEventListener('click', el.clickOutsideEvent);
  },
});
</script>

<style>
.dropdownSlide-enter-active,
.dropdownSlide-leave-active {
  @apply duration-200;
  @apply ease-in-out;
}

.dropdownSlide-enter-to, .dropdownSlide-leave {
   max-height: 500px;
   overflow: hidden;
}

.dropdownSlide-enter, .dropdownSlide-leave-to {
   overflow: hidden;
   max-height: 0;
}
</style>
