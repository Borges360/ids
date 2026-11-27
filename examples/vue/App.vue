<script setup>
import { ref } from 'vue';
const name = ref('');
const saved = ref(false);
</script>
<template>
  <main class="in-content-container"><h1>Vue fixture</h1>
    <form class="in-form-layout" @submit.prevent="saved = true">
      <div class="in-field-group"><label for="name">Nome</label><input id="name" v-model="name" required /></div>
      <button type="submit">Salvar rascunho</button>
      <p v-if="saved" role="status">Rascunho salvo</p>
    </form>
  </main>
</template>
