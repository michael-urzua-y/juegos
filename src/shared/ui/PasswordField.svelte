<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'
  import Icon from './Icon.svelte'

  let {
    value = $bindable(''),
    label,
    autocomplete = 'current-password',
    class: className = 'field',
    ...rest
  }: {
    value?: string
    label: string
    autocomplete?: 'current-password' | 'new-password'
    class?: string
  } & Omit<HTMLInputAttributes, 'type' | 'value' | 'class'> = $props()

  let visible = $state(false)
</script>

<label class="relative block">
  <span class="sr-only">{label}</span>
  <input
    {...rest}
    bind:value
    type={visible ? 'text' : 'password'}
    class={[className, 'pr-12']}
    placeholder={label}
    {autocomplete}
    autocapitalize="off"
    spellcheck="false"
  />
  <button
    type="button"
    class="absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center rounded-xl opacity-60 active:opacity-100"
    aria-label={visible ? 'Ocultar clave' : 'Mostrar clave'}
    onclick={() => (visible = !visible)}
  >
    <Icon name={visible ? 'eyeOff' : 'eye'} />
  </button>
</label>
