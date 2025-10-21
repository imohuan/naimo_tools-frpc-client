<template>
  <div class="h-full flex items-center justify-center">
    <!-- 状态卡片 -->
    <div
      class="w-full h-full relative overflow-hidden bg-white rounded-xl border border-gray-200 shadow-lg flex flex-col"
    >
      <!-- 背景装饰 -->
      <div
        class="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"
      ></div>
      <div
        class="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"
      ></div>

      <div class="relative overflow-y-auto flex-1 p-8 custom-scrollbar">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center space-x-4">
            <div class="relative">
              <div
                :class="[
                  'w-16 h-16 rounded-full flex items-center justify-center',
                  status.running
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                    : 'bg-gradient-to-br from-slate-700 to-slate-600',
                ]"
              >
                <svg
                  v-if="status.running"
                  class="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                <svg
                  v-else
                  class="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </div>
              <div
                v-if="status.running"
                class="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full animate-ping"
              ></div>
            </div>

            <div>
              <h2 class="text-3xl font-bold text-gray-900 mb-1">
                {{ status.running ? "FRP 运行中" : "FRP 未运行" }}
              </h2>
              <p class="text-gray-600">{{ status.message }}</p>
              <p v-if="status.pid" class="text-gray-500 text-sm mt-1">
                进程 ID: {{ status.pid }}
              </p>
            </div>
          </div>

          <button
            @click="refreshStatus"
            :disabled="loading"
            class="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all disabled:opacity-50"
          >
            <svg
              class="w-5 h-5 text-gray-600"
              :class="{ 'animate-spin': loading }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              ></path>
            </svg>
          </button>
        </div>

        <!-- 操作按钮 -->
        <div class="flex space-x-3">
          <button
            @click="handleInstall"
            :disabled="isInstalled || loading"
            class="flex-1 group relative overflow-hidden px-6 py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            :class="
              isInstalled
                ? 'bg-gray-200 text-gray-500'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30'
            "
          >
            <span class="relative z-10 flex items-center justify-center">
              <svg
                v-if="!isInstalled"
                class="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                ></path>
              </svg>
              <svg
                v-else
                class="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              {{ isInstalled ? "已安装" : "下载安装" }}
            </span>
            <div
              v-if="!isInstalled"
              class="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity"
            ></div>
          </button>

          <button
            @click="handleStart"
            :disabled="!isInstalled || status.running || loading"
            class="flex-1 group relative overflow-hidden px-6 py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30"
          >
            <span class="relative z-10 flex items-center justify-center">
              <svg
                class="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                ></path>
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              启动服务
            </span>
            <div
              class="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-20 transition-opacity"
            ></div>
          </button>

          <button
            @click="handleStop"
            :disabled="!status.running || loading"
            class="flex-1 group relative overflow-hidden px-6 py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg shadow-red-500/30"
          >
            <span class="relative z-10 flex items-center justify-center">
              <svg
                class="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                ></path>
              </svg>
              停止服务
            </span>
            <div
              class="absolute inset-0 bg-gradient-to-r from-red-400 to-orange-400 opacity-0 group-hover:opacity-20 transition-opacity"
            ></div>
          </button>
        </div>

        <!-- 进度条 -->
        <div
          v-if="downloadProgress"
          class="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100"
        >
          <div class="flex justify-between text-sm mb-2">
            <span class="text-gray-700">{{ downloadProgress.message }}</span>
            <span
              v-if="downloadProgress.progress"
              class="text-blue-600 font-semibold"
            >
              {{ downloadProgress.progress.toFixed(1) }}%
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 relative overflow-hidden"
              :style="{ width: `${downloadProgress.progress || 0}%` }"
            >
              <div
                class="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer"
              ></div>
            </div>
          </div>
        </div>

        <!-- 推荐服务 -->
        <div class="mt-8">
          <h3
            class="text-lg font-semibold text-gray-900 mb-4 flex items-center"
          >
            <svg
              class="w-5 h-5 mr-2 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              ></path>
            </svg>
            推荐服务
          </h3>

          <div class="grid gap-4">
            <!-- FRP0.TOP 推荐卡片 -->
            <a
              href="https://frp0.top/"
              target="_blank"
              class="group relative overflow-hidden rounded-xl p-6 border border-gray-200 hover:border-blue-400 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/30 cursor-pointer"
            >
              <!-- 科幻背景 -->
              <div
                class="absolute inset-0 bg-gradient-to-br from-blue-600/90 via-purple-600/90 to-pink-600/90"
              ></div>
              <div class="absolute inset-0 opacity-20">
                <div
                  class="absolute inset-0"
                  style="
                    background-image: linear-gradient(
                        rgba(255, 255, 255, 0.1) 1px,
                        transparent 1px
                      ),
                      linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0.1) 1px,
                        transparent 1px
                      );
                    background-size: 20px 20px;
                  "
                ></div>
              </div>
              <div
                class="absolute top-0 right-0 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"
              ></div>
              <div
                class="absolute bottom-0 left-0 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"
              ></div>

              <!-- 闪烁光效 -->
              <div
                class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              >
                <div
                  class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse-slow"
                ></div>
              </div>

              <!-- 内容 -->
              <div class="relative z-10">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center space-x-3">
                    <div
                      class="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center"
                    >
                      <svg
                        class="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        ></path>
                      </svg>
                    </div>
                    <div>
                      <h4 class="text-xl font-bold text-white mb-1">
                        FRP0.TOP
                      </h4>
                      <p class="text-blue-100 text-sm">专业 FRP 内网穿透服务</p>
                    </div>
                  </div>
                  <svg
                    class="w-5 h-5 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    ></path>
                  </svg>
                </div>

                <div class="space-y-3 mb-4">
                  <div class="flex items-center space-x-2">
                    <div
                      class="w-2 h-2 rounded-full bg-green-400 shadow-lg shadow-green-400/50"
                    ></div>
                    <span class="text-white/90 text-sm">支持免费试用</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <div
                      class="w-2 h-2 rounded-full bg-yellow-400 shadow-lg shadow-yellow-400/50"
                    ></div>
                    <span class="text-white/90 text-sm">年租仅需 ¥9.9</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <div
                      class="w-2 h-2 rounded-full bg-purple-400 shadow-lg shadow-purple-400/50"
                    ></div>
                    <span class="text-white/90 text-sm"
                      >高速稳定 • 多节点覆盖</span
                    >
                  </div>
                </div>

                <div
                  class="flex items-center justify-between pt-3 border-t border-white/20"
                >
                  <span class="text-white/70 text-xs">点击访问官网</span>
                  <div
                    class="px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-colors"
                  >
                    <span class="text-white text-sm font-semibold"
                      >立即体验</span
                    >
                  </div>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useNotify } from "../composables/useNotify";
import { clearLogs } from "../composables/useLog";

const { success, error } = useNotify();

interface FrpcStatus {
  running: boolean;
  pid?: number;
  message?: string;
}

interface DownloadProgress {
  type: "downloading" | "extracting" | "complete" | "error";
  message: string;
  progress?: number;
}

const emit = defineEmits<{
  (e: "status-change", running: boolean): void;
}>();

const status = ref<FrpcStatus>({ running: false, message: "未运行" });
const loading = ref(false);
const isInstalled = ref(false);
const downloadProgress = ref<DownloadProgress | null>(null);

// 监听状态变化并通知父组件
watch(
  () => status.value.running,
  (running) => {
    emit("status-change", running);
  }
);

async function checkInstallation() {
  try {
    isInstalled.value = window.frpcApi.checkFrpcInstalled();
  } catch (error) {
    console.error("检查安装状态失败:", error);
  }
}

async function refreshStatus() {
  loading.value = true;
  try {
    status.value = window.frpcApi.getFrpcStatus();
  } catch (error: any) {
    console.error("获取状态失败:", error);
  } finally {
    loading.value = false;
  }
}

async function handleInstall() {
  loading.value = true;
  downloadProgress.value = {
    type: "downloading",
    message: "准备下载...",
    progress: 0,
  };

  try {
    await window.frpcApi.downloadFrpc((progress) => {
      downloadProgress.value = progress;
    });

    isInstalled.value = true;
    success("frpc 安装成功！");
  } catch (error: any) {
    error(`安装失败: ${error.message}`);
  } finally {
    loading.value = false;
    setTimeout(() => {
      downloadProgress.value = null;
    }, 2000);
  }
}

async function handleStart() {
  loading.value = true;
  try {
    // 启动前清空历史日志
    clearLogs();

    const result = await window.frpcApi.startFrpc();
    status.value = result;
    if (result.running) {
      success("frpc 启动成功！");
    } else {
      error(`启动失败: ${result.message}`);
    }
  } catch (error: any) {
    error(`启动失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
}

async function handleStop() {
  loading.value = true;
  try {
    const result = await window.frpcApi.stopFrpc();
    status.value = result;
    success("frpc 已停止");
  } catch (error: any) {
    error(`停止失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await checkInstallation();
  await refreshStatus();
});
</script>

<style scoped>
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}

.animate-pulse-slow {
  animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 自定义滚动条样式 */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgb(243 244 246);
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgb(209 213 219);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgb(156 163 175);
}
</style>
