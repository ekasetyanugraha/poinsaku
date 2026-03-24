interface FeatureToggle {
  id: string
  key: string
  enabled: boolean
  label: string
  description: string | null
  updated_at: string
  created_at: string
}

export function useFeatureToggles() {
  const { data: togglesData, refresh: fetchToggles, status } = useFetch<{ data: FeatureToggle[] }>('/api/feature-toggles', {
    key: 'feature-toggles',
    default: () => ({ data: [] }),
  })

  const togglesMap = computed<Record<string, FeatureToggle>>(() => {
    const map: Record<string, FeatureToggle> = {}
    for (const toggle of togglesData.value?.data ?? []) {
      map[toggle.key] = toggle
    }
    return map
  })

  const loading = computed(() => status.value === 'pending')

  // Subscribe to Realtime updates for live toggle changes.
  // Per CLAUDE.md architecture rules, Supabase Realtime websocket subscriptions
  // are an allowed exception to the "no direct Supabase" rule.
  if (import.meta.client) {
    const supabase = useSupabaseClient()
    let channelInitialized = false

    function subscribeToRealtime() {
      if (channelInitialized) return
      channelInitialized = true

      supabase
        .channel('feature-toggles')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'feature_toggles' },
          () => {
            fetchToggles()
          },
        )
        .subscribe()
    }

    subscribeToRealtime()
  }

  function isEnabled(key: string): boolean {
    return togglesMap.value[key]?.enabled ?? false
  }

  return {
    toggles: togglesMap,
    isEnabled,
    loading,
    refresh: fetchToggles,
  }
}
