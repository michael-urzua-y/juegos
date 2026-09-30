<script lang="ts">
  import Icon from '@/shared/ui/Icon.svelte'
  import { whatsappLink } from '../subscription'

  let { contact, message = '' }: { contact: string; message?: string } = $props()

  const href = $derived(whatsappLink(contact, message))
</script>

{#if contact}
  {#if href}
    <a
      {href}
      target="_blank"
      rel="noopener noreferrer"
      class="flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 font-bold text-white active:scale-[0.98]"
    >
      <Icon name="chat" />Escribir por WhatsApp
    </a>
  {:else}
    <p class="text-center text-sm font-semibold">Contacto: {contact}</p>
  {/if}
{/if}
