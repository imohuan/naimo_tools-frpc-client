/// <reference path="../typings/naimo.d.ts" />

import { contextBridge } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { spawn, ChildProcess } from 'child_process';
import * as os from 'os';
import * as tar from 'tar';
import AdmZip from 'adm-zip';

// ==================== 类型定义 ====================
interface FrpcStatus {
  running: boolean;
  pid?: number;
  message?: string;
}

interface DownloadProgress {
  type: 'downloading' | 'extracting' | 'complete' | 'error';
  message: string;
  progress?: number;
}

// ==================== 全局变量 ====================

let frpcProcess: ChildProcess | null = null;
let logCallbacks: Array<(log: string, type: 'stdout' | 'stderr') => void> = [];

// 获取数据路径
async function getDataPaths() {
  try {
    const userDataPath = await naimo.system.getPath('userData');
    // const userDataPath = path.join(os.homedir(), '.naimo');
    const frpcDir = path.join(userDataPath, 'frpc');
    const frpcConfigPath = path.join(frpcDir, 'frpc.toml');
    return { userDataPath, frpcDir, frpcConfigPath };
  } catch (error) {
    // 如果获取主目录失败，使用临时目录
    const tempPath = path.join(os.tmpdir(), 'naimo-frpc-client');
    const frpcDir = path.join(tempPath, 'frpc');
    const frpcConfigPath = path.join(frpcDir, 'frpc.toml');
    return { userDataPath: tempPath, frpcDir, frpcConfigPath };
  }
}

// ==================== 工具函数 ====================

/**
 * 确保目录存在
 */
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 获取当前平台信息
 */
function getPlatformInfo(): { platform: string; arch: string; extension: string } {
  const platform = os.platform();
  const arch = os.arch();

  let platformName = '';
  let archName = '';
  let extension = '.tar.gz';

  // 平台名称映射
  if (platform === 'win32') {
    platformName = 'windows';
    extension = '.zip'; // Windows 版本通常使用 zip
  } else if (platform === 'darwin') {
    platformName = 'darwin';
  } else if (platform === 'linux') {
    platformName = 'linux';
  } else if (platform === 'freebsd') {
    platformName = 'freebsd';
  }

  // 架构映射
  if (arch === 'x64') {
    archName = 'amd64';
  } else if (arch === 'arm64') {
    archName = 'arm64';
  } else if (arch === 'arm') {
    archName = 'arm';
  }

  return { platform: platformName, arch: archName, extension };
}

/**
 * 获取最新版本号
 */
async function getLatestVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get('https://api.github.com/repos/fatedier/frp/releases/latest', {
      headers: { 'User-Agent': 'FrpcClient' }
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const version = release.tag_name;
          resolve(version);
        } catch (error) {
          reject(new Error('解析版本信息失败'));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 下载文件
 */
async function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    console.log(`开始下载: ${url}`);
    console.log(`保存到: ${destPath}`);

    protocol.get(url, {
      headers: { 'User-Agent': 'FrpcClient' }
    }, (res) => {
      console.log(`HTTP 状态码: ${res.statusCode}`);

      // 处理重定向
      if (res.statusCode === 302 || res.statusCode === 301) {
        const redirectUrl = res.headers.location;
        console.log(`重定向到: ${redirectUrl}`);
        if (redirectUrl) {
          downloadFile(redirectUrl, destPath, onProgress).then(resolve).catch(reject);
          return;
        }
      }

      // 检查状态码
      if (res.statusCode !== 200) {
        reject(new Error(`下载失败，HTTP 状态码: ${res.statusCode}`));
        return;
      }

      const totalSize = parseInt(res.headers['content-length'] || '0', 10);
      console.log(`文件大小: ${totalSize} 字节`);
      let downloadedSize = 0;

      const file = fs.createWriteStream(destPath);

      res.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize > 0 && onProgress) {
          const progress = (downloadedSize / totalSize) * 100;
          onProgress(progress);
        }
      });

      res.pipe(file);

      file.on('finish', () => {
        file.close((err) => {
          if (err) {
            fs.unlink(destPath, () => { });
            reject(err);
          } else {
            console.log(`文件下载完成: ${destPath}`);
            console.log(`实际下载大小: ${downloadedSize} 字节`);
            // 等待一下确保文件完全写入
            setTimeout(() => {
              resolve();
            }, 100);
          }
        });
      });

      file.on('error', (error) => {
        console.error('文件写入错误:', error);
        fs.unlink(destPath, () => { });
        reject(error);
      });
    }).on('error', (error) => {
      console.error('下载请求错误:', error);
      reject(error);
    });
  });
}

/**
 * 解压文件（支持 tar.gz 和 zip）
 */
async function extractArchive(archivePath: string, destDir: string): Promise<void> {
  console.log(`开始解压: ${archivePath}`);
  console.log(`目标目录: ${destDir}`);

  // 检查文件是否存在
  if (!fs.existsSync(archivePath)) {
    throw new Error(`压缩文件不存在: ${archivePath}`);
  }

  // 检查文件大小
  const stats = fs.statSync(archivePath);
  console.log(`文件大小: ${stats.size} 字节`);

  if (stats.size === 0) {
    throw new Error('下载的文件为空，请重试');
  }

  const ext = path.extname(archivePath).toLowerCase();
  console.log(`文件扩展名: ${ext}`);
  console.log(`完整文件名: ${path.basename(archivePath)}`);

  if (archivePath.endsWith('.tar.gz') || archivePath.endsWith('.tgz')) {
    console.log('使用 tar 解压 .tar.gz 文件');
    try {
      // 解压 tar.gz 文件，使用更详细的选项
      await tar.extract({
        file: archivePath,
        cwd: destDir,
        strip: 1, // 去除顶层目录
        onentry: (entry) => {
          console.log(`正在解压: ${entry.path}`);
        }
      });
      console.log('tar.gz 解压完成');
    } catch (error: any) {
      console.error('tar 解压失败:', error);
      throw new Error(`解压 tar.gz 文件失败: ${error.message}`);
    }
  } else if (ext === '.zip') {
    console.log('使用 AdmZip 解压 .zip 文件');
    try {
      const zip = new AdmZip(archivePath);
      const zipEntries = zip.getEntries();
      console.log(`zip 文件包含 ${zipEntries.length} 个条目`);

      // 检查是否所有文件都在同一个顶层目录下
      let topLevelDir = '';
      let hasTopLevelDir = true;

      for (const entry of zipEntries) {
        const entryPath = entry.entryName.replace(/\\/g, '/');
        const parts = entryPath.split('/');

        if (parts.length > 0) {
          if (!topLevelDir) {
            topLevelDir = parts[0];
          } else if (parts[0] !== topLevelDir) {
            hasTopLevelDir = false;
            break;
          }
        }
      }

      console.log(`顶层目录: ${topLevelDir}, 需要去除: ${hasTopLevelDir}`);

      // 解压文件，去除顶层目录
      for (const entry of zipEntries) {
        const entryPath = entry.entryName.replace(/\\/g, '/');
        let targetPath = entryPath;

        // 如果有统一的顶层目录，去除它
        if (hasTopLevelDir && topLevelDir) {
          const parts = entryPath.split('/');
          if (parts.length > 1) {
            // 去除第一层目录
            targetPath = parts.slice(1).join('/');
          } else {
            // 跳过顶层目录本身
            continue;
          }
        }

        const fullPath = path.join(destDir, targetPath);

        if (entry.isDirectory) {
          // 创建目录
          if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
          }
          console.log(`创建目录: ${targetPath}`);
        } else {
          // 确保父目录存在
          const dirPath = path.dirname(fullPath);
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
          }

          // 写入文件
          const content = entry.getData();
          fs.writeFileSync(fullPath, content);
          console.log(`解压文件: ${targetPath}`);
        }
      }

      console.log('zip 解压完成');
    } catch (error: any) {
      console.error('zip 解压失败:', error);
      throw new Error(`解压 zip 文件失败: ${error.message}`);
    }
  } else {
    throw new Error(`不支持的压缩格式: ${ext}`);
  }
}


// ==================== 主要功能 ====================

/**
 * 检查 frpc 是否已安装
 */
async function checkFrpcInstalled(): Promise<boolean> {
  const { platform } = getPlatformInfo();
  const frpcExe = platform === 'windows' ? 'frpc.exe' : 'frpc';
  const { frpcDir } = await getDataPaths();

  // 检查目录是否存在
  if (!fs.existsSync(frpcDir)) {
    return false;
  }

  // 查找 frpc 可执行文件
  try {
    const files = fs.readdirSync(frpcDir, { withFileTypes: true, recursive: true });
    for (const file of files) {
      if (file.isFile() && file.name === frpcExe) {
        return true;
      }
    }
  } catch (error) {
    return false;
  }

  return false;
}

/**
 * 获取 frpc 可执行文件路径
 */
async function getFrpcPath(): Promise<string | null> {
  const { platform } = getPlatformInfo();
  const frpcExe = platform === 'windows' ? 'frpc.exe' : 'frpc';
  const { frpcDir } = await getDataPaths();

  // 递归查找 frpc 可执行文件
  function findFrpc(dir: string): string | null {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isFile() && file.name === frpcExe) {
        return fullPath;
      } else if (file.isDirectory()) {
        const result = findFrpc(fullPath);
        if (result) return result;
      }
    }
    return null;
  }

  return findFrpc(frpcDir);
}

/**
 * 下载并安装 frpc（自动解压）
 */
async function downloadFrpc(
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  try {
    const { frpcDir } = await getDataPaths();
    ensureDir(frpcDir);

    onProgress?.({ type: 'downloading', message: '正在获取最新版本信息...', progress: 0 });

    let version = await getLatestVersion();
    if (!version) version = '0.64.0';
    version = '0.64.0';

    const { platform, arch, extension } = getPlatformInfo();
    const fileName = `frp_${version}_${platform}_${arch}${extension}`;
    const downloadUrl = `https://github.com/fatedier/frp/releases/download/v${version}/${fileName}`;
    const downloadPath = path.join(frpcDir, fileName);

    onProgress?.({ type: 'downloading', message: `正在下载 ${version}...`, progress: 0 });

    // 下载文件
    await downloadFile(downloadUrl, downloadPath, (progress) => {
      onProgress?.({ type: 'downloading', message: `正在下载 ${version}...`, progress });
    });

    onProgress?.({ type: 'extracting', message: '正在解压文件...', progress: 100 });

    // 解压文件（支持 tar.gz 和 zip）
    await extractArchive(downloadPath, frpcDir);

    // 删除压缩包
    try {
      fs.unlinkSync(downloadPath);
    } catch (e) {
      // 忽略删除失败
    }

    // 设置 frpc 可执行权限（Linux/Mac）
    if (platform !== 'windows') {
      const frpcPath = await getFrpcPath();
      if (frpcPath) {
        try {
          fs.chmodSync(frpcPath, '755');
        } catch (e) {
          // 忽略权限设置失败
        }
      }
    }

    onProgress?.({ type: 'complete', message: 'frpc 安装成功！' });
  } catch (error: any) {
    onProgress?.({ type: 'error', message: `安装失败: ${error.message}` });
    throw error;
  }
}

/**
 * 清理残留的 frpc 进程
 */
async function killAllFrpcProcesses(): Promise<void> {
  return new Promise((resolve) => {
    if (os.platform() === 'win32') {
      // Windows: 使用 taskkill 查找并终止所有 frpc 进程
      const killProcess = spawn('taskkill', ['/F', '/IM', 'frpc.exe'], {
        windowsHide: true
      });

      killProcess.on('close', () => {
        const log = '\n已清理残留的 frpc 进程\n';
        console.log(log);
        logCallbacks.forEach(callback => callback(log, 'stdout'));
        resolve();
      });

      killProcess.on('error', () => {
        // 忽略错误（可能没有残留进程）
        resolve();
      });
    } else {
      // Unix-like: 使用 pkill
      const killProcess = spawn('pkill', ['-9', 'frpc']);

      killProcess.on('close', () => {
        const log = '\n已清理残留的 frpc 进程\n';
        console.log(log);
        logCallbacks.forEach(callback => callback(log, 'stdout'));
        resolve();
      });

      killProcess.on('error', () => {
        // 忽略错误（可能没有残留进程）
        resolve();
      });
    }

    // 设置超时，避免一直等待
    setTimeout(resolve, 2000);
  });
}

/**
 * 启动 frpc
 */
async function startFrpc(): Promise<FrpcStatus> {
  try {
    if (frpcProcess && !frpcProcess.killed) {
      return { running: true, message: 'frpc 已在运行中' };
    }

    // 先清理可能残留的进程
    await killAllFrpcProcesses();

    // 等待一小段时间确保进程已清理
    await new Promise(resolve => setTimeout(resolve, 500));

    // 检查是否已安装
    if (!(await checkFrpcInstalled())) {
      throw new Error('frpc 未安装，请先下载安装');
    }

    const { frpcConfigPath } = await getDataPaths();

    // 检查配置文件是否存在
    if (!fs.existsSync(frpcConfigPath)) {
      // 创建默认配置
      await saveConfig(getDefaultConfig());
    }

    const frpcPath = await getFrpcPath();
    if (!frpcPath) {
      throw new Error('找不到 frpc 可执行文件');
    }

    const { platform } = getPlatformInfo();

    // 启动 frpc
    frpcProcess = spawn(frpcPath, ['-c', frpcConfigPath], {
      cwd: path.dirname(frpcPath),
      stdio: 'pipe',
      windowsHide: true,
      shell: platform === 'windows'
    });

    // 监听启动错误
    frpcProcess.on('error', (error) => {
      const log = `frpc 启动失败: ${error.message}\n`;
      console.error(`[frpc error]: ${log}`);
      logCallbacks.forEach(callback => callback(log, 'stderr'));
      frpcProcess = null;
    });

    // 监听输出（保留换行符）
    frpcProcess.stdout?.on('data', (data) => {
      const log = data.toString();
      console.log(`[frpc stdout]: ${log}`);
      logCallbacks.forEach(callback => callback(log, 'stdout'));
    });

    frpcProcess.stderr?.on('data', (data) => {
      const log = data.toString();
      console.error(`[frpc stderr]: ${log}`);
      logCallbacks.forEach(callback => callback(log, 'stderr'));
    });

    frpcProcess.on('close', (code) => {
      const log = `\nfrpc 进程退出，退出码: ${code}\n`;
      console.log(log);
      logCallbacks.forEach(callback => callback(log, code === 0 ? 'stdout' : 'stderr'));
      frpcProcess = null;
    });

    // 等待一小段时间确认进程已启动
    await new Promise(resolve => setTimeout(resolve, 500));

    // 检查进程是否还在运行
    if (frpcProcess && !frpcProcess.killed) {
      return {
        running: true,
        pid: frpcProcess.pid,
        message: 'frpc 启动成功'
      };
    } else {
      throw new Error('frpc 进程启动后立即退出，请检查配置');
    }
  } catch (error: any) {
    return {
      running: false,
      message: error.message
    };
  }
}

/**
 * 停止 frpc
 */
async function stopFrpc(): Promise<FrpcStatus> {
  try {
    if (!frpcProcess || frpcProcess.killed) {
      return { running: false, message: 'frpc 未运行' };
    }

    const pid = frpcProcess.pid;

    if (os.platform() === 'win32') {
      // Windows 平台使用 taskkill 强制终止进程树
      if (pid) {
        try {
          spawn('taskkill', ['/F', '/T', '/PID', pid.toString()]);
          const log = `\n强制终止 frpc 进程 (PID: ${pid})\n`;
          console.log(log);
          logCallbacks.forEach(callback => callback(log, 'stdout'));
        } catch (killError) {
          console.error('taskkill 失败:', killError);
        }
      }
    } else {
      // Unix-like 系统使用 SIGTERM，如果失败则使用 SIGKILL
      try {
        frpcProcess.kill('SIGTERM');
        // 等待 2 秒后如果还没退出则强制 kill
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (frpcProcess && !frpcProcess.killed) {
          frpcProcess.kill('SIGKILL');
        }
      } catch (killError) {
        console.error('kill 失败:', killError);
      }
    }

    frpcProcess = null;

    return { running: false, message: 'frpc 已停止' };
  } catch (error: any) {
    return { running: false, message: error.message };
  }
}

/**
 * 获取 frpc 运行状态
 */
function getFrpcStatus(): FrpcStatus {
  const running = frpcProcess !== null && !frpcProcess.killed;
  return {
    running,
    pid: frpcProcess?.pid,
    message: running ? 'frpc 运行中' : 'frpc 未运行'
  };
}

/**
 * 获取默认配置
 */
function getDefaultConfig(): string {
  return `# FRP 客户端配置文件
# 详细配置请参考: https://github.com/fatedier/frp

# 【重要】请修改为你的 FRP 服务器地址和端口
serverAddr = "your-server.com"
serverPort = 7000

# 认证配置（与服务端保持一致）
auth.method = "token"
auth.token = "your_token_here"

# 日志配置
log.to = "./frpc.log"
log.level = "info"
log.maxDays = 3

# 示例代理配置（根据需要修改或添加更多代理）
[[proxies]]
name = "web"
type = "http"
localIP = "127.0.0.1"
localPort = 8080
customDomains = ["your-domain.com"]

[[proxies]]
name = "ssh"
type = "tcp"
localIP = "127.0.0.1"
localPort = 22
remotePort = 6000
`;
}

/**
 * 保存配置文件
 */
async function saveConfig(content: string): Promise<void> {
  const { frpcDir, frpcConfigPath } = await getDataPaths();
  ensureDir(frpcDir);
  fs.writeFileSync(frpcConfigPath, content, 'utf-8');
}

/**
 * 读取配置文件
 */
async function loadConfig(): Promise<string> {
  try {
    const { frpcConfigPath } = await getDataPaths();
    if (!fs.existsSync(frpcConfigPath)) {
      const defaultConfig = getDefaultConfig();
      await saveConfig(defaultConfig);
      return defaultConfig;
    }
    return fs.readFileSync(frpcConfigPath, 'utf-8');
  } catch (error) {
    return getDefaultConfig();
  }
}

/**
 * 注册日志监听器
 */
function onLog(callback: (log: string, type: 'stdout' | 'stderr') => void): () => void {
  logCallbacks.push(callback);
  // 返回取消监听函数
  return () => {
    const index = logCallbacks.indexOf(callback);
    if (index > -1) {
      logCallbacks.splice(index, 1);
    }
  };
}

/**
 * 清除所有日志监听器
 */
function clearLogListeners(): void {
  logCallbacks = [];
}

// ==================== API 导出 ====================

const api = {
  // frpc 管理
  checkFrpcInstalled,
  downloadFrpc,
  startFrpc,
  stopFrpc,
  getFrpcStatus,

  // 配置管理
  loadConfig,
  saveConfig,
  getDefaultConfig,

  // 日志管理
  onLog,
  clearLogListeners,

  // 工具函数
  getPlatformInfo,
};

// 导出 API 到渲染进程
contextBridge.exposeInMainWorld('frpcApi', api);

// 类型声明（供前端使用）
declare global {
  interface Window {
    frpcApi: typeof api;
  }
}
