import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { app, ipcMain } from 'electron'
import { isLinux, isMacOS } from './platform.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const DOCKER_PATH = (() => {
  if (isLinux()) return 'sudo /usr/bin/docker';
  if (isMacOS()) return '/usr/local/bin/docker';
  return '';
})();

export const init = async () => {
  ipcMain.on('docker-ps', event => {
    const result = getDockerContainers()
    event.reply('docker-ps-response', result)
  })

  ipcMain.on('docker-check-php-version', (event, args) => {
    const result = checkPHPVersion(args.container_id)

    if (!result) {
      event.reply('docker-check-php-version-error', result)
      return
    }

    event.reply('docker-check-php-version-response', result)
  })

  ipcMain.on('docker-install-phar-client', (event, args) => {
    const versionMatch = args.phpVersion.match(/^(\d+\.\d+)/)
    const phpVersion = versionMatch ? versionMatch[1] : null

    const result = installPharClient(phpVersion, args.container_id)

    if (!result) {
      event.reply('docker-install-phar-client-error')
      return
    }

    event.reply('docker-install-phar-client-response', {
      container_id: args.container_id,
      phar: result,
    })
  })

  ipcMain.on('docker-which-php', (event, args) => {
    const result = getPhpPath(args.containerId)

    if (!result) {
      event.reply('docker-which-php-error')
      return
    }

    event.reply('docker-which-php-response', {
      phpPath: result,
    })
  })
}

export const getDockerContainers = () => {
  try {
    const result = execSync(`${DOCKER_PATH} ps --format "{{.ID}}|{{.Names}}|{{.Image}}"`).toString().trim()

    if (result) {
      return result.split('\n').map(line => {
        const [id, name, image] = line.split('|')

        return { id, name, image }
      })
    }

    return null
  } catch (error) {
    console.error(`Error retrieving docker container: ${error}`)
  }

  return null
}

export const getPhpPath = (containerId: string) => {
  try {
    return execSync(`${DOCKER_PATH} exec ${containerId} which php`).toString().trim()
  } catch (error) {
    console.error(`Error retrieving which php ${containerId}: ${error}`)
    return null
  }
}

export const installPharClient = (phpVersion: string | null, containerId: string): any => {
  let getClient: string = app.isPackaged
    ? path.join(process.resourcesPath, `public/client-${phpVersion}.phar`)
    : path.join(__dirname, `../public/client-${phpVersion}.phar`)

  try {
    const pharPath = `/tmp/client-${phpVersion}.phar`
    const result = execSync(`${DOCKER_PATH} cp ${getClient} ${containerId}:'${pharPath}'`).toString().trim()

    console.log(`Phar was copied in Container ${containerId} to /tmp/client-${phpVersion}.phar:`, result)

    return pharPath
  } catch (error) {
    console.error(`Failed to copy phar in container ${containerId}`, error)
    return null
  }
}

export const checkPHPVersion = (containerId: string) => {
  try {
    const result = execSync(`${DOCKER_PATH} exec ${containerId} php --version`).toString().trim()

    const versionMatch = result.match(/PHP\s(\d+\.\d+\.\d+)/)
    const phpVersion = versionMatch ? versionMatch[1] : null

    console.log(`PHP Version result in Container ${containerId}:`, phpVersion)

    return { phpPath: getPhpPath(containerId), phpVersion }
  } catch (error) {
    console.error(`Error executing PHP in container ${containerId}:`, error)
    return null
  }
}
