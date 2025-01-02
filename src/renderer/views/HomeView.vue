<script setup lang="ts">
  import { onMounted, PropType } from 'vue'
  import { useHistoryStore } from '../stores/history'
  import { TrashIcon } from '@heroicons/vue/24/outline'
  import { useTabsStore } from '../stores/tabs'
  import Divider from '../components/Divider.vue'
  import Container from '../components/Container.vue'
  import { useSettingsStore } from '../stores/settings'
  import { Tab } from '../types/tab.type'
  import { History } from '../types/history.type'
  import { isWindows } from '../../main/platform.ts'

  const tabsStore = useTabsStore()
  const historyStore = useHistoryStore()
  const settingsStore = useSettingsStore()

  const props = defineProps({
    tab: {
      type: Object as PropType<Tab>,
      default: () => {
        return {}
      },
    },
  })

  const updateTab = (history: History) => {
    const pathSplitter = isWindows() ? '\\' : '/'

    let tab: Tab = props.tab
    tab.type = 'code'
    tab.path = history.path
    tab.name = history.path.split(pathSplitter).pop()
    tabsStore.updateTab(tab)
  }

  onMounted(() => {})
</script>

<template>
  <Container class="flex items-center justify-center">
    <div class="w-full max-w-lg px-5">
      <div class="text-2xl">Tweaks</div>
      <Divider class="mt-3" />
      <div class="space-y-2 mt-3">
        <div class="flex items-center justify-between">
          <button class="text-blue-500" @click="updateTab({ path: settingsStore.settings.laravelPath })">
            laravel
          </button>
        </div>
        <div class="flex items-center justify-between" v-for="history in historyStore.history">
          <button class="text-blue-500" @click="updateTab(history)">
            {{ history.path }}
          </button>
          <button>
            <TrashIcon @click="historyStore.removeHistory(history)" class="w-4 h-4 hover:text-red-600" />
          </button>
        </div>
      </div>
    </div>
  </Container>
</template>
