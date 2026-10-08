import { saveSettings } from '../db/db'
import { driveProvider } from './drive-provider'
import { createBackupEngine } from './engine'
import { folderProvider } from './folder'
import { makeSnapshot } from './snapshot'

export const backupEngine = createBackupEngine({
  providers: { drive: driveProvider, folder: folderProvider },
  snapshot: () => makeSnapshot(),
  onSuccess: (at) => saveSettings({ lastBackupAt: at }),
})

export { driveConfigured } from './google-auth'
export { folderSupported } from './folder'
export { canShareFiles } from './share'
