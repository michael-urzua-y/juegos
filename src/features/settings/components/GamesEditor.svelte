<script lang="ts">
  import { LIMITS } from '@/shared/config'
  import Icon from '@/shared/ui/Icon.svelte'
  import SectionTitle from '@/shared/ui/SectionTitle.svelte'
  import { addGame, removeGame, settings } from '../store.svelte'

  let newGame = $state('')

  function submit(e: SubmitEvent) {
    e.preventDefault()
    addGame(newGame)
    newGame = ''
  }
</script>

<div class="card">
  <SectionTitle>Juegos</SectionTitle>
  <div class="flex flex-wrap gap-2">
    {#each settings.games as game, i (game)}
      <span class="chip h-10 gap-1 pr-2 pl-4 text-sm">
        {game}
        <button
          type="button"
          class="grid size-7 place-items-center rounded-full active:bg-black/10"
          onclick={() => removeGame(i)}
          aria-label="Quitar {game}"
        >
          <Icon name="x" class="size-4" />
        </button>
      </span>
    {/each}
  </div>
  {#if settings.games.length < LIMITS.maxGames}
    <form class="mt-3 flex gap-2" onsubmit={submit}>
      <input
        class="field"
        placeholder="Nuevo juego"
        maxlength={LIMITS.gameMaxLength}
        bind:value={newGame}
        enterkeyhint="done"
      />
      <button class="chip size-12 shrink-0" aria-label="Agregar juego"><Icon name="plus" /></button>
    </form>
  {/if}
</div>
