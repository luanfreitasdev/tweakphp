<script setup lang="ts">
  import Container from '../components/Container.vue'
  import Title from '../components/Title.vue'
  import PrimaryButton from '../components/PrimaryButton.vue'
  import Divider from '../components/Divider.vue'
  import { onMounted, onUnmounted, ref, watch } from 'vue'
  import ArrowPathIcon from '../components/icons/ArrowPathIcon.vue'
  import { useTabsStore } from '../stores/tabs.ts'
  import SelectInput from '../components/SelectInput.vue'
  import TextInput from '../components/TextInput.vue'
  import { Tab } from '../types/tab.type.ts'
  import router from '../router'
  import SwitchInput from '../components/SwitchInput.vue'
  import { DockerContainerResponse, PharPathResponse, PHPInfoResponse } from '../../main/types/docker.type.ts'

  const tabsStore = useTabsStore()

  const created = ref<boolean>(false)
  const dockerEnabled = ref<boolean>(false)
  const loading = ref<boolean>(false)
  const containers = ref<{ id: string; name: string; image: string }[]>([])
  const errorResponse = ref<string|null>(null)
  const phpVersion = ref<string | null>(null)
  const phpPath = ref<string | null>(null)

  const shouldConnect = ref<boolean>(false)

  const form = ref<{ working_directory: string; container_id: any; container_name: string }>({
    container_id: '',
    container_name: '',
    working_directory: '/var/www/html',
  })

  const connect = () => {
    const index = containers.value.findIndex(c => c.id === form.value.container_id)

    if (index !== -1) {
      const selected = containers.value[index]

      form.value.container_name = selected.name
    }

    window.ipcRenderer.send('docker-install-phar-client', {
      php_version: phpVersion.value,
      container_id: form.value.container_id,
    })
  }

  const selectDockerContainer = () => {
    if (!form.value.container_id) {
      return
    }

    created.value = false

    window.ipcRenderer.send('docker-check-php-version', {
      container_id: form.value.container_id,
    })
  }

  const listDockerContainer = () => {
    loading.value = true
    window.ipcRenderer.send('docker-ps')
  }

  const handleDockerCheckPHPVersionResponse = (e: PHPInfoResponse) => {
    errorResponse.value = ''
    loading.value = false
    phpVersion.value = e.php_version
    phpPath.value = e.php_path
    shouldConnect.value = true

    if (!created.value) {
      dockerEnabled.value = true
    }
  }

  const handleDockerInstallPharClientResponse = (e: PharPathResponse) => {
    errorResponse.value = ''
    let currentTab: Tab = tabsStore.findTab(tabsStore.current?.id)

    currentTab.remote_phar_client = e.phar_path
    currentTab.remote_path = form.value.working_directory
    currentTab.docker.enable = true
    currentTab.docker.php = phpPath.value ?? 'Not Found'
    currentTab.docker.php_version = phpVersion.value ?? 'Not Found'
    currentTab.docker.container_id = form.value.container_id
    currentTab.docker.container_name = form.value.container_name

    tabsStore.updateTab(currentTab)

    router.push({ name: 'code', params: { id: currentTab.id } })
  }

  const handleDockerInstallPharClientError = () => {
    alert(`PHP Client for version ${phpVersion.value} not found`)
  }

  const handleDockerCheckPHPVersionError = () => {
    phpVersion.value = 'Not Found'
    errorResponse.value = ''
    shouldConnect.value = false
  }

  const handleDockerPsError = (e: { error: string }) => {
    errorResponse.value = e.error
    loading.value = false
  }

  const handleDockerPsResponse = (e: DockerContainerResponse[]) => {
    errorResponse.value = ''
    containers.value = e || []
    loading.value = false
  }

  onMounted(() => {
    listDockerContainer()

    if (tabsStore.current && tabsStore.current.docker) {
      dockerEnabled.value = tabsStore.current.docker.enable
    }

    form.value.container_id = tabsStore.current?.docker.container_id ?? ''
    form.value.container_name = tabsStore.current?.docker.container_name ?? ''

    selectDockerContainer()

    created.value = true

    window.ipcRenderer.on('docker-ps-response', handleDockerPsResponse)
    window.ipcRenderer.on('docker-ps-error', handleDockerPsError)

    window.ipcRenderer.on('docker-check-php-version-error', handleDockerCheckPHPVersionError)
    window.ipcRenderer.on('docker-check-php-version-response', handleDockerCheckPHPVersionResponse)

    window.ipcRenderer.on('docker-install-phar-client-error', handleDockerInstallPharClientError)
    window.ipcRenderer.on('docker-install-phar-client-response', handleDockerInstallPharClientResponse)
  })

  onUnmounted(() => {
    window.ipcRenderer.removeListener('docker-ps-response', handleDockerPsResponse)
    window.ipcRenderer.removeListener('docker-ps-error', handleDockerPsError)

    window.ipcRenderer.removeListener('docker-check-php-version-error', handleDockerCheckPHPVersionError)
    window.ipcRenderer.removeListener('docker-check-php-version-response', handleDockerCheckPHPVersionResponse)

    window.ipcRenderer.removeListener('docker-install-phar-client-error', handleDockerInstallPharClientError)
    window.ipcRenderer.removeListener('docker-install-phar-client-response', handleDockerInstallPharClientResponse)
  })

  watch(dockerEnabled, (value: boolean) => {
    if (!tabsStore.current) {
      return
    }

    tabsStore.current.docker.enable = value
    tabsStore.updateTab(tabsStore.current)
  })
</script>

<template>
  <Container class="pt-[38px]">
    <div class="max-w-2xl mx-auto p-10">
      <Title>Docker Settings</Title>
    </div>

    <div class="max-w-2xl mx-auto p-10">
      <div class="flex justify-between">
        Enabled
        <SwitchInput :disabled="!shouldConnect" v-model="dockerEnabled" />
      </div>

      <Divider class="mt-6" />

      <div class="mt-3 max-w-2xl mx-auto space-y-3">
        <div class="grid grid-cols-2 items-center">
          <div>Containers</div>

          <div class="flex gap-3 items-center">
            <div class="w-full">
              <SelectInput
                v-if="containers.length > 0"
                placeholder="Select container"
                id="docker-containers"
                v-model="form.container_id"
                @change="selectDockerContainer"
              >
                <option v-for="container in containers" :key="container.id" :value="container.id">
                  {{ container.name }}
                </option>
              </SelectInput>
              <div v-else>
                  {{ errorResponse ? 'Error' : 'No containers found' }}
              </div>
            </div>
            <div class="w-10 flex justify-center">
              <ArrowPathIcon
                :spin="true"
                @click="listDockerContainer"
                :class="{ 'animate-spin': loading }"
                class="w-6 cursor-pointer h-6 hover:text-primary-500"
              />
            </div>
          </div>
        </div>

        <Divider />

        <div v-if="Object.values(containers).length > 0" class="space-y-3">
          <div class="grid grid-cols-2 items-center">
            <div>PHP Version</div>
            {{ phpVersion ?? '--' }}
          </div>

          <Divider />
          <div class="grid grid-cols-2 items-center">
            <div>Working directory</div>
            <TextInput id="work_directory" :disabled="!shouldConnect" v-model="form.working_directory" />
          </div>

          <Divider />
          <div class="grid grid-cols-2 items-center">
            <div>Status</div>
            {{ tabsStore.current?.remote_phar_client ? 'Connected' : 'Disconnected' }}
          </div>

          <Divider />
          <div class="flex items-center justify-end">
            <PrimaryButton :disabled="!shouldConnect" @click="connect">Connect</PrimaryButton>
          </div>
        </div>

        <div class="mt-2">
          <span v-text="errorResponse" class="text-xs text-red-500"></span>
        </div>
      </div>
    </div>
  </Container>
</template>

<style scoped></style>
