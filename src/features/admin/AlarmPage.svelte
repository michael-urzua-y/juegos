<script lang="ts">
  import { testAlarm } from '@/features/alarm'
  import { AlarmSettings, ReliabilityTips } from '@/features/settings'
</script>

<section class="space-y-4">
  <AlarmSettings onTest={testAlarm} />
  <ReliabilityTips />
</section>
