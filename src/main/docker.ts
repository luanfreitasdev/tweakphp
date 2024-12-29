import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { app, ipcMain } from 'electron'
import { DockerContainerResponse, PHPInfoResponse } from './types/docker.type.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const DOCKER_MACOS_PATH = '/usr/local/bin/docker'

export const init = async () => {
  ipcMain.on('docker.containers.info', async event => {
    try {
      const containers = getDockerContainers()
      event.reply('docker.containers.reply', containers)
    } catch (error: unknown) {
      event.reply('docker.containers.reply.error', { error })
    }
  })

  ipcMain.on('docker.php-version.info', (event, args) => {
    try {
      const result = checkPHPVersion(args.container_id)
      event.reply('docker.php-version.reply', result)
    } catch (error: unknown) {
      event.reply('docker.php-version.reply.error', { error })
    }
  })

  ipcMain.on('docker.copy-phar.execute', (event, args) => {
    try {
      const versionMatch = args.php_version.match(/^(\d+\.\d+)/)
      const phpVersion = versionMatch ? versionMatch[1] : null

      const result = installPharClient(phpVersion, args.container_id)

      event.reply('docker.copy-phar.reply', {
        container_id: args.container_id,
        phar_path: result,
      })
    } catch (error: unknown) {
      event.reply('docker.copy-phar.reply.error', { error })
    }
  })
}

export const getDockerContainers = (): DockerContainerResponse[] | null => {
  try {
    const result = execSync(`${DOCKER_MACOS_PATH} ps --format "{{.ID}}|{{.Names}}|{{.Image}}"`, {
      encoding: 'utf-8',
    }).trim()

    if (result) {
      return result.split('\n').map(line => {
        const [id, name, image] = line.split('|')
        return { id, name, image }
      })
    }

    return null
  } catch (error: unknown) {
    throw new Error(parseDockerErrorMessage(error))
  }
}

export const getPhpPath = (containerId: string): string | null => {
  try {
    return execSync(`${DOCKER_MACOS_PATH} exec ${containerId} which php`).toString().trim()
  } catch (error: unknown) {
    throw new Error(parseDockerErrorMessage(error))
  }
}

export const installPharClient = (phpVersion: string | null, containerId: string): string => {
  let getClient: string = app.isPackaged
    ? path.join(process.resourcesPath, `public/client-${phpVersion}.phar`)
    : path.join(__dirname, `../public/client-${phpVersion}.phar`)

  try {
    const pharPath = `/tmp/client-${phpVersion}.phar`
    execSync(`${DOCKER_MACOS_PATH} cp ${getClient} ${containerId}:'${pharPath}'`).toString().trim()

    return pharPath
  } catch (error) {
    throw new Error(parseDockerErrorMessage(error))
  }
}

export const checkPHPVersion = (containerId: string): PHPInfoResponse => {
  try {
    const result = execSync(`${DOCKER_MACOS_PATH} exec ${containerId} php --version`).toString().trim()

    const versionMatch = result.match(/PHP\s(\d+\.\d+\.\d+)/)
    const phpVersion = versionMatch ? versionMatch[1] : null

    return {
      php_path: getPhpPath(containerId) || '',
      php_version: phpVersion || '',
    }
  } catch (error) {
    throw new Error(parseDockerErrorMessage(error))
  }
}

const parseDockerErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const endIndex = error.message.indexOf("See 'docker")
    return endIndex !== -1 ? error.message.slice(0, endIndex).trim() : error.message
  }

  return 'An unknown error occurred'
}
