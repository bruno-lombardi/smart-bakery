import { useSyncExternalStore } from 'react'
import { backupEngine } from './index'

export function useBackupState() {
  return useSyncExternalStore(backupEngine.subscribe, backupEngine.getState)
}
