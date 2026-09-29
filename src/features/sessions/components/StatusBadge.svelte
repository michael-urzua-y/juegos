<script lang="ts">
  import { STATUS_LABEL, type SessionStatus } from '../model'
  import { TONE_STYLES } from '../tone'

  let { status }: { status: SessionStatus } = $props()
</script>

<span class={['rounded-full px-2 py-0.5 text-xs font-bold', TONE_STYLES[status === 'running' ? 'ok' : status].badge]}>
  {STATUS_LABEL[status]}
</span>
