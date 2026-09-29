<script lang="ts">
  import Icon from '@/shared/ui/Icon.svelte'
  import SectionTitle from '@/shared/ui/SectionTitle.svelte'
  import NewSessionForm from './components/NewSessionForm.svelte'
  import SessionList from './components/SessionList.svelte'
  import { activeSessions } from './store.svelte'

  /** Cuántos turnos se muestran bajo el formulario; el resto está en "Activos". */
  const PREVIEW = 3

  let { onShowAll }: { onShowAll: () => void } = $props()

  const active = $derived(activeSessions())
</script>

<div class="space-y-4">
  <NewSessionForm />

  {#if active.length}
    <div class="flex items-center justify-between px-1 pt-2">
      <SectionTitle class="mb-0">Próximos en salir</SectionTitle>
      {#if active.length > PREVIEW}
        <button type="button" class="flex items-center text-sm font-bold text-orange-600" onclick={onShowAll}>
          Ver los {active.length}<Icon name="chevronRight" class="size-4" />
        </button>
      {/if}
    </div>
    <SessionList items={active.slice(0, PREVIEW)} />
  {/if}
</div>
