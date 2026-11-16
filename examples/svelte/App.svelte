<script>
  let name = $state('');
  let saved = $state(false);
</script>
<main class="in-content-container"><h1>Svelte fixture</h1>
  <form class="in-form-layout" onsubmit={(event) => { event.preventDefault(); saved = true; }}>
    <div class="in-field-group"><label for="name">Nome</label><input id="name" bind:value={name} required /></div>
    <button type="submit">Salvar rascunho</button>
    {#if saved}<p role="status">Rascunho salvo</p>{/if}
  </form>
</main>
