<template>
  <div class="h-24 m-2 flex border border-gray-300 rounded overflow-hidden">
    <div class="h-24 w-24 flex items-center justify-center bg-primary text-white">
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="h-16 w-16" viewBox="0 0 16 16">
        <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
        <path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468
          11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
      </svg>
    </div>
    <div class="w-full pl-2">
      <div class="flex items-center justify-between">
        <h1 class="font-bold text-lg">{{ user.username }}</h1>
        <div class="flex space-x-2 m-2">
          <button
           @click="$emit('editUser', user)">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-5 h-5 text-black" viewBox="0 0 16 16">
              <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707
                0l1.293 1.293zm-1.75 2.456l-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25
                0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
              <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0
                1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5
                0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
            </svg>
          </button>
          <!-- <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-5 h-5 text-black" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1
            .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0
              1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0
              1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5
              3V2h11v1h-11z"/>
          </svg> -->
        </div>
      </div>
      <div class="pl-2">
        <h2 class="font-bold text-base">Userrights</h2>
        <div class="space-x-2 text-sm flex items-center">
          <label for="cbxCanEdit">Can edit:</label>
          <input type="checkbox" id="cbxCanEdit" disabled :checked="user.canEdit">
        </div>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  props: {
    user: Object,
  },
};
</script>
