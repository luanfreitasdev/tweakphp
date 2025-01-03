import { execSync } from 'child_process'

export const getVersion = (path: string | undefined) => {
  try {
    const command = `"${path}" -r "echo PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION . PHP_EOL;"`
    const output = execSync(command, { encoding: 'utf8' })
    return output.trim() // Clean up extra whitespace or newlines
  } catch (error: any) {
    console.error('Error executing PHP command:', error.message)
    console.error('Stack:', error.stack)
    return null
  }
}
