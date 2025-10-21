<template>
  <div
    class="h-screen w-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 text-gray-900 overflow-hidden"
  >
    <!-- Tab 切换栏 -->
    <div class="flex-shrink-0 px-4 pt-3">
      <div class="flex items-center justify-between border-b border-gray-200">
        <div class="flex space-x-1.5" style="height: 42px">
          <button
            @click="activeTab = 'service'"
            :class="[
              'px-5 py-2 font-medium transition-all relative text-sm',
              activeTab === 'service'
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-700',
            ]"
          >
            <span class="relative z-10">部署服务</span>
            <div
              v-if="activeTab === 'service'"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500"
            ></div>
          </button>
          <button
            @click="activeTab = 'config'"
            :class="[
              'px-5 py-2 font-medium transition-all relative text-sm',
              activeTab === 'config'
                ? 'text-purple-600'
                : 'text-gray-500 hover:text-gray-700',
            ]"
          >
            <span class="relative z-10">配置数据</span>
            <div
              v-if="activeTab === 'config'"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500"
            ></div>
          </button>
          <button
            v-if="isRunning"
            @click="activeTab = 'terminal'"
            :class="[
              'px-5 py-2 font-medium transition-all relative text-sm',
              activeTab === 'terminal'
                ? 'text-green-600'
                : 'text-gray-500 hover:text-gray-700',
            ]"
          >
            <span class="relative z-10 flex items-center">
              终端日志
              <span
                class="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"
              ></span>
            </span>
            <div
              v-if="activeTab === 'terminal'"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-500"
            ></div>
          </button>
        </div>

        <!-- teleport 目标容器 -->
        <div id="tab-actions" class="flex space-x-1.5 pb-2"></div>
      </div>
    </div>

    <!-- Tab 内容区 -->
    <div class="flex-1 min-h-0 px-4 py-3 relative">
      <div
        v-show="activeTab === 'service'"
        class="absolute inset-0 left-4 right-4 top-3 bottom-3"
      >
        <ServiceTab @status-change="handleStatusChange" />
      </div>
      <div
        v-show="activeTab === 'config'"
        class="absolute inset-0 left-4 right-4 top-3 bottom-3"
      >
        <ConfigTab :is-active="activeTab === 'config'" />
      </div>
      <div
        v-if="isRunning"
        v-show="activeTab === 'terminal'"
        class="absolute inset-0 left-4 right-4 top-3 bottom-3"
      >
        <TerminalLog :is-active="activeTab === 'terminal'" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ServiceTab from "./ServiceTab.vue";
import ConfigTab from "./ConfigTab.vue";
import TerminalLog from "./TerminalLog.vue";

const activeTab = ref<"service" | "config" | "terminal">("service");
const isRunning = ref(false);

function handleStatusChange(running: boolean) {
  isRunning.value = running;
  // 如果停止运行且当前在终端tab，自动切换回服务tab
  if (!running && activeTab.value === "terminal") {
    activeTab.value = "service";
  }
  // 如果启动运行，自动切换到终端tab
  if (running) {
    activeTab.value = "terminal";
  }
}
</script>
