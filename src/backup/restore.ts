import { parseBackup, type BackupFile } from '../db/backup'
import { createDriveClient, type DriveClient, type DriveFile } from './drive'
import { requestToken } from './google-auth'
import { backupEngine } from './index'

export interface DriveListing {
  client: DriveClient
  files: DriveFile[]
}

/** Lista os backups do Drive. Chame direto de um toque (pode abrir o login do Google). */
export async function listDriveBackups(): Promise<DriveListing> {
  const client = createDriveClient(() => requestToken('interactive'))
  const folderId = await client.ensureFolder(backupEngine.getState().drive.meta.folderId)
  return { client, files: await client.listBackups(folderId) }
}

export async function fetchDriveBackup(client: DriveClient, fileId: string): Promise<BackupFile> {
  return parseBackup(await client.download(fileId))
}
