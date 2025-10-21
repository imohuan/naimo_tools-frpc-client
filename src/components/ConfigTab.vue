<template>
  <div class="h-full flex flex-col">
    <!-- 使用 teleport 将按钮传送到 tab 栏右侧 -->
    <Teleport v-if="isActive" to="#tab-actions">
      <button
        @click="loadConfigFromFile"
        class="px-4 py-2 rounded-lg text-sm font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-all"
      >
        重新加载
      </button>
      <button
        @click="resetToDefault"
        class="px-4 py-2 rounded-lg text-sm font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-all"
      >
        恢复默认
      </button>
      <button
        @click="parseAndAddComments"
        class="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transition-all shadow-lg shadow-indigo-500/30"
      >
        智能注释
      </button>
      <button
        @click="saveConfigToFile"
        :disabled="loading"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/30"
      >
        保存配置
      </button>
    </Teleport>

    <!-- 编辑器 -->
    <div
      class="h-full bg-white rounded-xl border border-gray-200 overflow-hidden shadow-lg"
    >
      <textarea
        v-model="config"
        class="w-full h-full bg-transparent text-gray-900 font-mono text-sm p-6 focus:outline-none resize-none leading-relaxed"
        placeholder="请输入 frpc 配置..."
        spellcheck="false"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useNotify } from "../composables/useNotify";

defineProps<{
  isActive?: boolean;
}>();

const { success, error: showError } = useNotify();

const config = ref("");
const loading = ref(false);

// FRPC 配置字段说明
const configDocs: Record<string, string> = {
  serverAddr: "服务器地址 - FRP 服务端的 IP 地址或域名",
  serverPort: "服务器端口 - FRP 服务端监听的端口号",
  "auth.method": "认证方式 - 可选: token, oidc",
  "auth.token": "认证令牌 - 与服务端配置的 token 保持一致",
  "auth.oidc": "OIDC 认证配置",
  user: "用户名 - 区分不同客户端，可选配置",
  "log.to": "日志输出路径 - 日志文件保存位置，可以是文件路径或 console",
  "log.level": "日志级别 - 可选: trace, debug, info, warn, error",
  "log.maxDays": "日志保留天数 - 自动清理多少天前的日志",
  "transport.protocol": "传输协议 - 可选: tcp, kcp, quic, websocket, wss",
  "transport.dialServerTimeout": "连接超时时间 - 单位：秒",
  "transport.dialServerKeepAlive": "保持连接时间 - 单位：秒",
  "transport.connectServerLocalIP": "本地连接 IP - 连接服务器使用的本地 IP",
  "transport.proxyURL": "代理 URL - HTTP/HTTPS/SOCKS5 代理地址",
  "transport.poolCount": "连接池数量 - 预创建的连接数",
  "transport.tcpMux": "TCP 多路复用 - 是否启用 TCP 多路复用",
  "transport.tcpMuxKeepaliveInterval": "TCP 多路复用心跳间隔 - 单位：秒",
  "transport.heartbeatInterval": "心跳间隔 - 单位：秒",
  "transport.heartbeatTimeout": "心跳超时 - 单位：秒",
  "transport.tls.enable": "启用 TLS - 是否使用 TLS 加密连接",
  "transport.tls.certFile": "TLS 证书文件路径",
  "transport.tls.keyFile": "TLS 密钥文件路径",
  "transport.tls.trustedCaFile": "受信任的 CA 证书文件路径",
  "transport.tls.serverName": "TLS 服务器名称 - 用于验证服务器证书",
  dnsServer: "DNS 服务器 - 自定义 DNS 服务器地址",
  loginFailExit: "登录失败退出 - 登录失败时是否退出程序",
  start: "启动代理 - 指定启动时激活的代理名称列表",
  includes: "包含配置文件 - 引入其他配置文件的路径列表",
  name: "代理名称 - 唯一标识一个代理配置",
  type: "代理类型 - 可选: tcp, udp, http, https, stcp, sudp, xtcp, tcpmux",
  localIP: "本地 IP - 被代理的本地服务 IP 地址",
  localPort: "本地端口 - 被代理的本地服务端口",
  remotePort: "远程端口 - 服务端监听的公网端口",
  customDomains: "自定义域名 - HTTP/HTTPS 代理的域名列表",
  subdomain: "子域名 - 自动生成的子域名前缀",
  locations: "路径前缀 - HTTP 代理的路径前缀",
  httpUser: "HTTP 用户名 - HTTP Basic Auth 用户名",
  httpPwd: "HTTP 密码 - HTTP Basic Auth 密码",
  hostHeaderRewrite: "重写 Host 头 - 修改转发请求的 Host 头",
  "requestHeaders.set": "设置请求头 - 添加或修改 HTTP 请求头",
  "responseHeaders.set": "设置响应头 - 添加或修改 HTTP 响应头",
  useEncryption: "启用加密 - 是否对代理流量进行加密",
  useCompression: "启用压缩 - 是否对代理流量进行压缩",
  bandwidthLimit: "带宽限制 - 限制代理的带宽，格式: 100KB, 10MB",
  bandwidthLimitMode: "带宽限制模式 - client 或 server",
  plugin: "插件类型 - 使用的插件名称",
  "plugin.": "插件配置 - 特定插件的配置参数",
  "healthCheck.type": "健康检查类型 - tcp 或 http",
  "healthCheck.timeoutSeconds": "健康检查超时 - 单位：秒",
  "healthCheck.maxFailed": "最大失败次数 - 连续失败多少次后下线",
  "healthCheck.intervalSeconds": "健康检查间隔 - 单位：秒",
  "healthCheck.path": "健康检查路径 - HTTP 健康检查的 URL 路径",
  secretKey: "密钥 - stcp/sudp 类型代理的密钥",
  allowUsers: "允许的用户 - stcp/sudp 服务端允许的客户端用户列表",
  group: "负载均衡组 - 相同组名的代理会进行负载均衡",
  groupKey: "负载均衡组密钥",
  multiplexer: "多路复用器 - 是否启用连接多路复用",
  "loadBalancer.group": "负载均衡组名",
  "loadBalancer.groupKey": "负载均衡组密钥",
};

// 解析配置并添加注释
function parseAndAddComments() {
  const lines = config.value.split("\n");
  const result: string[] = [];
  const processedKeys = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // 跳过空行和已有注释
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      result.push(line);
      continue;
    }

    // 检查是否是配置行
    if (trimmedLine.includes("=") || trimmedLine.startsWith("[[")) {
      // 处理 section 标题
      if (trimmedLine.startsWith("[[")) {
        const sectionMatch = trimmedLine.match(/\[\[(\w+)\]\]/);
        if (sectionMatch) {
          // 检查上一行是否已经有分隔注释
          const prevLine = result[result.length - 1];
          if (!prevLine || !prevLine.trim().includes("====")) {
            result.push("# ==================== 代理配置 ====================");
          }
          result.push(line);
        }
      } else {
        // 处理普通配置项
        const keyMatch = trimmedLine.match(/^([\w.]+)\s*=/);
        if (keyMatch) {
          const key = keyMatch[1];

          // 查找匹配的文档
          let foundDoc = false;
          for (const [docKey, docValue] of Object.entries(configDocs)) {
            if (key === docKey || key.startsWith(docKey + ".")) {
              if (!processedKeys.has(key)) {
                // 检查上一行是否已经有注释（避免重复添加）
                const prevLine = result[result.length - 1];
                const prevLineTrimmed = prevLine?.trim() || "";
                const expectedComment = `# ${docValue}`;

                // 如果上一行不是相同的注释，才添加
                if (
                  !prevLineTrimmed.startsWith("#") ||
                  prevLineTrimmed !== expectedComment
                ) {
                  result.push(expectedComment);
                }
                processedKeys.add(key);
              }
              foundDoc = true;
              break;
            }
          }

          // 如果没有找到匹配的文档说明，添加提示注释
          if (!foundDoc && !processedKeys.has(key)) {
            const prevLine = result[result.length - 1];
            const prevLineTrimmed = prevLine?.trim() || "";
            const unknownComment = `# [未识别] ${key} - 此配置项未在文档中定义`;

            // 检查上一行是否已经有注释
            if (
              !prevLineTrimmed.startsWith("#") ||
              !prevLineTrimmed.includes("[未识别]")
            ) {
              result.push(unknownComment);
            }
            processedKeys.add(key);
          }
        }
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }

  // 检查是否已经有"其他可用配置"部分
  const hasOtherConfigSection = result.some(
    (line) =>
      line.includes("其他可用配置") ||
      line.includes("未在配置中使用但可用的配置项")
  );

  if (!hasOtherConfigSection) {
    // 在文件末尾添加未配置项的说明
    result.push("\n# ==================== 其他可用配置 ====================");
    result.push("# 以下是未在配置中使用但可用的配置项：\n");

    const allKeys = Object.keys(configDocs);
    const unusedKeys = allKeys.filter((key) => !processedKeys.has(key));

    // 按类别分组
    const categories: Record<string, string[]> = {
      基础配置: [],
      日志配置: [],
      传输配置: [],
      "TLS 配置": [],
      代理配置: [],
      高级配置: [],
    };

    unusedKeys.forEach((key) => {
      const doc = configDocs[key];
      if (key.startsWith("log.")) {
        categories["日志配置"].push(`# ${key} - ${doc}`);
      } else if (key.startsWith("transport.")) {
        categories["传输配置"].push(`# ${key} - ${doc}`);
      } else if (key.includes("tls")) {
        categories["TLS 配置"].push(`# ${key} - ${doc}`);
      } else if (
        ["name", "type", "localIP", "localPort", "remotePort"].some((k) =>
          key.includes(k)
        )
      ) {
        categories["代理配置"].push(`# ${key} - ${doc}`);
      } else if (
        ["serverAddr", "serverPort", "auth."].some((k) => key.includes(k))
      ) {
        categories["基础配置"].push(`# ${key} - ${doc}`);
      } else {
        categories["高级配置"].push(`# ${key} - ${doc}`);
      }
    });

    // 输出各类别
    for (const [category, items] of Object.entries(categories)) {
      if (items.length > 0) {
        result.push(`\n# ${category}:`);
        items.forEach((item) => result.push(item));
      }
    }
  }

  config.value = result.join("\n");
}

// 从文件加载配置
async function loadConfigFromFile() {
  try {
    config.value = await window.frpcApi.loadConfig();
  } catch (error: any) {
    showError(`加载配置失败: ${error.message}`);
  }
}

// 保存配置到文件
async function saveConfigToFile() {
  loading.value = true;
  try {
    await window.frpcApi.saveConfig(config.value);
    success("配置保存成功！");
  } catch (error: any) {
    showError(`保存配置失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
}

// 恢复默认配置
function resetToDefault() {
  if (confirm("确定要恢复默认配置吗？当前配置将被覆盖。")) {
    config.value = window.frpcApi.getDefaultConfig();
  }
}

onMounted(() => {
  loadConfigFromFile();
});
</script>

<style scoped>
textarea::-webkit-scrollbar {
  width: 8px;
}

textarea::-webkit-scrollbar-track {
  background: rgb(243 244 246);
}

textarea::-webkit-scrollbar-thumb {
  background: rgb(209 213 219);
  border-radius: 4px;
}

textarea::-webkit-scrollbar-thumb:hover {
  background: rgb(156 163 175);
}
</style>
