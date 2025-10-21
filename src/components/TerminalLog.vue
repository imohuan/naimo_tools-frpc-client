<template>
  <div
    class="h-full flex flex-col bg-white rounded-lg overflow-hidden border border-gray-200 shadow-lg"
  >
    <!-- 使用 teleport 将按钮传送到 tab 栏右侧 -->
    <Teleport v-if="isActive" to="#tab-actions">
      <div class="flex gap-1.5">
        <button
          @click="toggleWrap"
          class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-all"
          :title="wrapEnabled ? '禁用换行' : '启用换行'"
        >
          {{ wrapEnabled ? "禁用换行" : "启用换行" }}
        </button>
        <button
          @click="clearLogs"
          class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-all"
        >
          清空日志
        </button>
      </div>
    </Teleport>

    <div
      ref="logContainer"
      class="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed bg-gray-50 select-text"
      :class="{
        'whitespace-pre-wrap': wrapEnabled,
        'whitespace-pre': !wrapEnabled,
      }"
    >
      <div v-for="(log, index) in logs" :key="index" class="py-0.25">
        <span class="select-text" v-html="log.html"></span>
      </div>
      <div v-if="logs.length === 0" class="text-gray-400 text-center mt-4">
        等待日志输出...
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from "vue";
import { useLog } from "../composables/useLog";

defineProps<{
  isActive?: boolean;
}>();

const { logs, clearLogs } = useLog();
const logContainer = ref<HTMLDivElement>();
const wrapEnabled = ref(true);

// 切换换行
function toggleWrap() {
  wrapEnabled.value = !wrapEnabled.value;
}

// 监听日志变化，自动滚动到底部
watch(
  () => logs.value.length,
  () => {
    nextTick(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight;
      }
    });
  }
);
</script>

<style scoped>
/* 自定义滚动条 */
div::-webkit-scrollbar {
  width: 8px;
}

div::-webkit-scrollbar-track {
  background: rgb(243 244 246);
}

div::-webkit-scrollbar-thumb {
  background: rgb(209 213 219);
  border-radius: 4px;
}

div::-webkit-scrollbar-thumb:hover {
  background: rgb(156 163 175);
}

/* 启用文本选择 */
:deep(span) {
  user-select: text;
  cursor: text;
}

/* 换行控制 */
.whitespace-pre-wrap :deep(span) {
  white-space: pre-wrap;
  word-break: break-word;
}

.whitespace-pre {
  overflow-x: auto;
}

.whitespace-pre :deep(span) {
  white-space: pre;
}
</style>
