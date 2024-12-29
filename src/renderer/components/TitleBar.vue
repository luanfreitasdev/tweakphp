<script setup lang="ts">
  import { PlayIcon, CogIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'
  import events from '../events'
  import { useRoute } from 'vue-router'
  import router from '../router'
  import HorizontalSplitIcon from './icons/HorizontalSplitIcon.vue'
  import VerticalSplitIcon from './icons/VerticalSplitIcon.vue'
  import { useSettingsStore } from '../stores/settings'
  import { useExecuteStore } from '../stores/execute'

  const settingsStore = useSettingsStore()
  const executeStore = useExecuteStore()
  const route = useRoute()
  const platform = window.platformInfo.getPlatform()

  const execute = () => {
    if (route.name !== 'code') {
      router.push({ name: 'home' })
      return
    }
    events.dispatchEvent(new CustomEvent('execute', { detail: null }))
  }

  const updateLayout = (layout: any) => {
    settingsStore.settings.layout = layout
    settingsStore.update()
  }
</script>

<template>
  <div
    id="title-bar"
    class="fixed top-0 right-0 h-[38px]"
    :class="{
      'z-40 left-0 w-full border-b': platform === 'darwin',
      'z-50': platform !== 'darwin',
    }"
    :style="{
      backgroundColor: settingsStore.colors.background,
      borderColor: settingsStore.colors.border,
    }"
  >
    <div
      class="absolute right-0 flex items-center justify-between"
      :class="{
        'w-full left-0 h-full px-2': platform === 'darwin',
        'h-[27px] pr-2': platform !== 'darwin',
      }"
      :style="{
        backgroundColor: settingsStore.colors.background,
      }"
    >
      <div class="flex-grow-0 w-[120px]" v-if="platform === 'darwin'"></div>
      <div class="flex-grow w-full drag flex items-center justify-center" v-if="platform === 'darwin'">TweakPHP</div>
      <div class="flex-grow-0 flex items-center">
        <div v-tippy="'Change layout'">
          <template v-if="$router.currentRoute.value.name === 'code'">
            <VerticalSplitIcon
              @click="updateLayout('vertical')"
              v-if="settingsStore.settings.layout === 'horizontal'"
              class="cursor-pointer w-8 h-8 hover:!stroke-primary-500"
            />
            <HorizontalSplitIcon
              @click="updateLayout('horizontal')"
              v-if="settingsStore.settings.layout === 'vertical'"
              class="cursor-pointer w-8 h-8 hover:!stroke-primary-500"
            />
          </template>
        </div>

        <div class="w-5 h-5" v-tippy="route.name === 'code' ? 'Cmd + R' : 'Run'">
          <ArrowPathIcon
            v-if="executeStore.executing"
            :spin="true"
            class="text-primary-500 animate-spin w-[18px] h-[18px]"
          />
          <PlayIcon
            v-if="!executeStore.executing"
            @click="execute"
            class="w-5 h-5 cursor-pointer hover:text-primary-500"
          />
        </div>
        <div v-tippy="'Settings'">
          <CogIcon
            @click="$router.push({ name: 'settings' })"
            class="w-5 h-5 cursor-pointer ml-1 hover:text-primary-500"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .drag {
    -webkit-app-region: drag;
  }
</style>
