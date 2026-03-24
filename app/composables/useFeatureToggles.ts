interface FeatureToggle {
  id: string
  key: string
  enabled: boolean
  label: string
  description: string | null
  updated_at: string
  created_at: string
}

// Global shared state — all components share the same toggle data
const togglesMap = useState<Record<string, FeatureToggle>>('feature-toggles', () => ({}))
const loading = useState<boolean>('feature-toggles-loading', () => false)
let channelInitialized = false

export function useFeatureToggles() {
  const supabase = useSupabaseClient()

  async function fetchToggles() {
    loading.value = true
    try {
      const response = await $fetch<{ data: FeatureToggle[] }>('/api/feature-toggles')
      const map: Record<string, FeatureToggle> = {}
      for (const toggle of response.data ?? []) {
        map[toggle.key] = toggle
      }
      togglesMap.value = map
    }
    catch {
      // Silently fail — toggles default to false via isEnabled
    }
    finally {
      loading.value = false
    }
  }

  // Subscribe to Realtime updates for live toggle changes.
  // Per CLAUDE.md architecture rules, Supabase Realtime websocket subscriptions
  // are an allowed exception to the "no direct Supabase" rule.
  function subscribeToRealtime() {
    if (channelInitialized) return
    channelInitialized = true

    supabase
      .channel('feature-toggles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feature_toggles' },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const toggle = payload.new as FeatureToggle
            togglesMap.value = { ...togglesMap.value, [toggle.key]: toggle }
          }
          else if (payload.eventType === 'DELETE') {
            const newMap = { ...togglesMap.value }
            const deleted = payload.old as Partial<FeatureToggle>
            if (deleted.key) {
              delete newMap[deleted.key]
            }
            togglesMap.value = newMap
          }
        },
      )
      .subscribe()
  }

  // Initialize: fetch once and subscribe to realtime on first use
  if (import.meta.client && Object.keys(togglesMap.value).length === 0 && !loading.value) {
    fetchToggles()
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
