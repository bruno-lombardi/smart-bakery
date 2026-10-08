import { createDriveClient, DriveAuthError } from './drive'
import { forgetToken, requestToken } from './google-auth'
import { driveConfigured } from './google-auth'
import { KEEP_DAYS, NeedsInteraction, backupFileName, type Provider } from './types'

export const driveProvider: Provider = {
  id: 'drive',
  available: () => driveConfigured,
  async backup(snap, { interactive, meta }) {
    const mode = interactive ? (meta.consented ? 'interactive' : 'first') : 'silent'
    const client = createDriveClient(() => requestToken(mode))
    try {
      const folderId = await client.ensureFolder(meta.folderId)
      await client.upsertBackup(folderId, backupFileName(snap.day), snap.json)
      await client.prune(folderId, KEEP_DAYS)
      return { folderId, consented: '1' }
    } catch (e) {
      if (e instanceof DriveAuthError) {
        forgetToken()
        throw new NeedsInteraction()
      }
      throw e
    }
  },
}
