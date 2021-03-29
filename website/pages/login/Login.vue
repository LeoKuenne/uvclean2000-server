<template>
  <div>
    <transition-group name="slide" mode="out-in">
    <form class="flex flex-col space-y-2" key="form">
      <input
        class="p-2 border border-gray-600 rounded"
        placeholder="Username"
        id="username"
        type="text"
        v-model="username"
        autofocus>
      <input
        class="p-2 border border-gray-600 rounded"
        placeholder="Password"
        id="password"
        type="password"
        v-model="password">
      <button
        class="p-2 bg-primary text-white font-bold transform duration-75 hover:scale-105"
        type="submit"
        @click="handleSubmit">
        Login
      </button>
      <button
        class="transform duration-75 hover:scale-105"
        @click="handleSubmitAsGuest">
        Login as guest
      </button>
    </form>
    <h1 class="p-2 font-bold text-lg text-center text-red-500" key="message"
      :class="[message === '' ? 'hidden' : 'visible']">
      {{ message }}
    </h1>
  </transition-group>
  </div>
</template>
<script>
export default {
  name: 'Login',
  data() {
    return {
      username: '',
      password: '',
      message: '',
    };
  },
  methods: {
    handleSubmitAsGuest() {
      fetch('/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: 'guest',
          password: 'guest',
        }),
        // redirect: 'follow',
      }).then(async (response) => {
        if (response.status !== 201) {
          const error = await response.json();
          throw new Error(error.msg);
        }
        if (response.redirected) {
          window.location.href = response.url;
        }
        return response;
      }).catch((error) => {
        this.message = error;
      });
    },
    async handleSubmit(e) {
      e.preventDefault();
      if (this.username.length > 0 && this.password.length > 0) {
        fetch('/login/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            username: this.username,
            password: this.password,
          }),
        }).then((response) => response.json()).then((response) => {
          if (response.status !== 201) {
            throw new Error(response.msg);
          }
          console.log('Test', response);
          if (response.url) {
            window.location.href = response.url;
          }
          return response;
        }).catch((error) => {
          this.message = error;
        });
      } else {
        this.message = 'Please provide username and password';
      }
    },
  },
};
</script>
<style>
.slide-move {
  /* transition: transform 1s; */
}
</style>
