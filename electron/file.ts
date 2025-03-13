import { app } from 'electron'
import path from 'node:path'
import fs from 'fs/promises'

// 系统默认文件路径（打包后在 resources 目录下）
export function getSystemModelsPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'models')
    : path.join(process.cwd(), 'public')
}

// 用户文件路径（在用户数据目录下）
export function getUserModelsPath(): string {
  return path.join(app.getPath('userData'), 'models')
}

// 确保目录存在
export async function ensureDirectories(): Promise<void> {
  const userDir = getUserModelsPath()
  try {
    await fs.access(userDir)
  } catch {
    await fs.mkdir(userDir, { recursive: true })
  }
}

// 获取所有模型文件
export async function getAllModels() {
  const systemDir = getSystemModelsPath()
  const userDir = getUserModelsPath()

  // 获取系统默认模型
  const systemModels = await fs
    .readdir(systemDir)
    .then((files) =>
      files
        .filter((file) => file.endsWith('.glb'))
        .map((file) => ({
          name: path.parse(file).name,
          path: path.parse(file).name + '.glb', // 根据环境返回不同的路径
          isSystem: true,
        }))
    )
    .catch(() => [])

  // 获取用户上传的模型
  const userModels = await fs
    .readdir(userDir)
    .then((files) =>
      files
        .filter((file) => file.endsWith('.glb'))
        .map((file) => ({
          name: path.parse(file).name,
          path: `file://${path.join(userDir, file)}`, // 使用 file:// 协议的完整路径
          isSystem: false,
        }))
    )
    .catch(() => [])

  return [...systemModels, ...userModels]
}

// 保存用户上传的模型
export async function saveUserModel(
  filePath: string,
  fileName: string
): Promise<void> {
  const targetPath = path.join(getUserModelsPath(), fileName)
  await fs.copyFile(filePath, targetPath)
}

// 删除用户上传的模型
export async function deleteUserModel(fileName: string): Promise<void> {
  const filePath = path.join(getUserModelsPath(), fileName)
  try {
    const stat = await fs.stat(filePath)
    if (stat.isFile()) {
      await fs.unlink(filePath)
    }
  } catch {
    // 文件不存在，忽略错误
  }
}
