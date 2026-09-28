const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");

// 在 Node 虚拟浏览器中运行编译后的前端脚本。
function runBrowserScript(relativePath, additions) {
  const options = additions || {};
  const window = options.window || {};
  if (!window.sessionStorage) {
    window.sessionStorage = {
    getItem() {
      return null;
    },
    setItem() {},
    removeItem() {},
    };
  }
  const context = vm.createContext({
    AbortSignal,
    CustomEvent,
    EventTarget,
    FileReader: class FileReader {},
    URL,
    console,
    fetch: options.fetch,
    window,
  });
  const sourcePath = path.join(projectRoot, ".runtime", relativePath);
  const source = fs.readFileSync(sourcePath, "utf8");
  vm.runInContext(source, context, { filename: relativePath });
  return context;
}

test("status transport failure remains unknown instead of claiming AI is offline", async function testTransportFailure() {
  const browserWindow = new EventTarget();
  browserWindow.location = {
    protocol: "https:",
    origin: "https://example.test",
  };
  browserWindow.APP_CONFIG = {};

  const context = runBrowserScript("js/ai-service.js", {
    window: browserWindow,
    fetch: async function fetchStatus() {
      throw new DOMException("Timed out", "TimeoutError");
    },
  });

  const status = await context.window.AiService.getStatus();

  assert.equal(status.connected, null);
  assert.equal(status.checking, true);
});

test("verified connection failure is displayed as disconnected", function testConnectionFailure() {
  const context = runBrowserScript("js/ai-chat.js");
  const classes = new Set();
  const statusElement = {
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
    },
    innerHTML: "",
  };
  context.document = {
    querySelector(selector) {
      if (selector === "#aiStatus") {
        return statusElement;
      }
      return null;
    },
  };
  const controller = context.window.NiyunAiChat.create({
    $: function findStatusElement(selector) {
      if (selector === "#aiStatus") {
        return statusElement;
      }
      return null;
    },
    $$: function findStatusElements() {
      return [];
    },
    escapeHtml: String,
    renderMarkdown: String,
    showToast() {},
    aiService: {},
    sessionStorageKey: "test",
  });

  controller.renderStatus({ connected: false, configured: true, verified: true });

  assert.match(statusElement.innerHTML, /连接失败/);
  assert.equal(classes.has("disconnected"), true);
  assert.equal(classes.has("checking"), false);
});

test("failed probe and failed chat are not marked as still checking; success recovers", async function testRecovery() {
  const browserWindow = new EventTarget();
  browserWindow.location = { protocol: "https:", origin: "https://example.test" };
  const statuses = [];
  browserWindow.addEventListener("ai-status-change", function recordStatus(event) {
    statuses.push(event.detail);
  });
  let succeeds = false;
  const context = runBrowserScript("js/ai-service.js", {
    window: browserWindow,
    fetch: async function fetchChat(url) {
      const isStatusRequest = url.endsWith("/status");
      let responseData = { error: "InternalError", errorCode: "UPSTREAM_HTTP_500" };
      if (isStatusRequest) {
        responseData = { connected: false, configured: true, verified: true };
      } else if (succeeds) {
        responseData = { reply: "OK" };
      }
      return {
        ok: isStatusRequest || succeeds,
        status: succeeds ? 200 : 500,
        json: async function readResponse() {
          return responseData;
        },
      };
    },
  });
  const status = await context.window.AiService.getStatus();
  assert.equal(Boolean(status.checking), false);
  await assert.rejects(context.window.AiService.chat({ message: "test" }), /UPSTREAM_HTTP_500/);
  assert.equal(statuses.at(-1).connected, false);
  assert.equal(statuses.at(-1).checking, false);
  succeeds = true;
  await context.window.AiService.chat({ message: "test" });
  assert.equal(statuses.at(-1).connected, true);
});

test("missing AI configuration is still shown as unavailable", function testMissingConfiguration() {
  const context = runBrowserScript("js/ai-chat.js");
  const classes = new Set();
  const statusElement = {
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
    },
    innerHTML: "",
  };
  context.document = {
    querySelector(selector) {
      if (selector === "#aiStatus") {
        return statusElement;
      }
      return null;
    },
  };
  const controller = context.window.NiyunAiChat.create({
    $: function findStatusElement(selector) {
      if (selector === "#aiStatus") {
        return statusElement;
      }
      return null;
    },
    $$: function findStatusElements() {
      return [];
    },
    escapeHtml: String,
    renderMarkdown: String,
    showToast() {},
    aiService: {},
    sessionStorageKey: "test",
  });

  controller.renderStatus({ connected: false, configured: false, verified: true });

  assert.match(statusElement.innerHTML, /打了个小盹/);
  assert.equal(classes.has("disconnected"), true);
  assert.equal(classes.has("checking"), false);
});
