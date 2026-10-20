const NiyunAiChat = (function registerAiChatController() {
    "use strict";
    return {
        create(dependencies: ChatDependencies) {
            const source1 = dependencies;
            const findElement = source1.findElement;
            const findElements = source1.findElements;
            const escapeHtml = source1.escapeHtml;
            const renderMarkdown = source1.renderMarkdown;
            const showToast = source1.showToast;
            const aiService = source1.aiService;
            const sessionStorageKey = source1.sessionStorageKey;
            let selectedImages: SelectedImage[] = [];
            let sessionId = window.sessionStorage.getItem(sessionStorageKey) || "";
            function appendMessage(text: string, role: string) {
                const messages = (document.querySelector("#chatMessages") as HTMLElement);
                const message = document.createElement("div");
                message.className = ("chat-message " + (role));
                message.textContent = text;
                messages.appendChild(message);
                messages.scrollTop = messages.scrollHeight;
                return message;
            }
            function normalizeDisplayedAiName(text: string) {
                return String(text || "").replaceAll("于见泥", "印小灵");
            }
            function renderSelectedImages() {
                const preview = (document.querySelector("#uploadPreview") as HTMLElement);
                preview.hidden = selectedImages.length === 0;
                (document.querySelector("#uploadCount") as HTMLElement).textContent = ("印小灵收到 " + (selectedImages.length) + " 张图片啦");
                let valueResult1;
                const items2 = selectedImages;
                const result5 = [];
                for (let index4 = 0; index4 < items2.length; index4++) {
                    let valueResult3;
                    {
                        const item = items2[index4];
                        const index = index4;
                        valueResult3 = ("<div class=\"upload-item\"><img src=\"" + (item.previewUrl) + "\" alt=\"待上传图片 " + (index + 1) + "\"><button type=\"button\" data-remove-image=\"" + (item.id) + "\" aria-label=\"移除" + (escapeHtml(item.file.name)) + "\">×</button><span title=\"" + (escapeHtml(item.file.name)) + "\">" + (escapeHtml(item.file.name)) + "</span></div>");
                    }
                    result5.push(valueResult3);
                }
                valueResult1 = result5;
                (document.querySelector("#uploadThumbnails") as HTMLElement).innerHTML = valueResult1.join("");
            }
            // 清空预览时释放临时图片地址，避免多次上传后一直占用内存
            function clearSelectedImages() {
                const items7 = selectedImages;
                for (let index9 = 0; index9 < items7.length; index9++) {
                    {
                        const item = items7[index9];
                        URL.revokeObjectURL(item.previewUrl);
                    }
                }
                selectedImages = [];
                (document.querySelector("#aiImage") as HTMLInputElement).value = "";
                renderSelectedImages();
            }
            // 先显示用户消息和等待提示，再请求回答；成功或失败都要恢复发送按钮
            async function send(message: string) {
                let valueResult9;
                const items12 = selectedImages;
                const result15 = [];
                for (let index14 = 0; index14 < items12.length; index14++) {
                    let valueResult11;
                    {
                        const item = items12[index14];
                        valueResult11 = item.file;
                    }
                    result15.push(valueResult11);
                }
                valueResult9 = result15;
                const images = valueResult9;
                if (!message && !images.length) {
                    return;
                }
                let valueResult13;
                if (images.length) {
                    valueResult13 = ("带了 " + (images.length) + " 张图片给你看");
                }
                else {
                    valueResult13 = "";
                }
                const uploadText = valueResult13;
                let valueResult15;
                const items18 = [message, uploadText];
                const result21 = [];
                for (let index20 = 0; index20 < items18.length; index20++) {
                    if (Boolean(items18[index20])) {
                        result21.push(items18[index20]);
                    }
                }
                valueResult15 = result21;
                appendMessage(valueResult15.join(" · "), "user");
                (document.querySelector("#aiQuestion") as HTMLInputElement).value = "";
                clearSelectedImages();
                const pending = appendMessage("印小灵正在翻翻小册子……", "assistant pending");
                const submitButton = (document.querySelector("#chatForm button[type='submit']") as HTMLButtonElement);
                submitButton.disabled = true;
                try {
                    const result = await aiService.chat({ message: message, images: images, sessionId: sessionId });
                    pending.innerHTML = renderMarkdown(normalizeDisplayedAiName(result.reply));
                    pending.classList.remove("pending");
                    if (result.sessionId) {
                        sessionId = result.sessionId;
                        window.sessionStorage.setItem(sessionStorageKey, sessionId);
                    }
                }
                catch (error) {
                    pending.textContent = ("呜，线索暂时没接上：" + (normalizeDisplayedAiName(error.message)));
                    pending.classList.remove("pending");
                }
                finally {
                    submitButton.disabled = false;
                }
            }
            function renderStatus(status: AiStatus) {
                const element = (document.querySelector("#aiStatus") as HTMLElement);
                if (!element) {
                    return;
                }
                const ready = status.connected === true;
                const unavailable = status.configured === false || status.connected === false;
                // 仅未知状态使用检查样式；明确失败优先于 checking 标记
                const checking = !ready && !unavailable;
                element.classList.toggle("disconnected", unavailable);
                element.classList.toggle("checking", checking);
                let label = "暂未确认连接状态";
                if (ready) {
                    label = "印小灵已经准备好啦";
                }
                else {
                    if (status.configured === false) {
                        label = "印小灵暂时打了个小盹";
                    }
                    else {
                        if (unavailable) {
                            label = "连接失败，请稍后重试";
                        }
                    }
                }
                element.innerHTML = ("<i></i> " + (label));
            }
            // 集中绑定发送、快捷提问、上传和清空事件，页面初始化时调用一次
            function init() {
                window.addEventListener("ai-status-change", function handleAiStatusChange(event) {
                    return renderStatus(event.detail || { connected: false });
                });
                let valueResult17;
                const value23 = (document.querySelector("#chatForm") as HTMLFormElement);
                if (value23 === null || value23 === undefined) {
                    valueResult17 = undefined;
                }
                else {
                    const value24 = value23.addEventListener;
                    valueResult17 = value24.call(value23, "submit", function handleSubmit(event) {
                        event.preventDefault();
                        send((document.querySelector("#aiQuestion") as HTMLInputElement).value.trim());
                    });
                }
                const items26 = (Array.from(document.querySelectorAll("[data-prompt]")) as HTMLElement[]);
                for (let index28 = 0; index28 < items26.length; index28++) {
                    {
                        const button = items26[index28];
                        button.addEventListener("click", function handleClick() {
                            return send(button.dataset.prompt);
                        });
                    }
                }
                let valueResult23;
                const value31 = (document.querySelector("#aiImage") as HTMLInputElement);
                if (value31 === null || value31 === undefined) {
                    valueResult23 = undefined;
                }
                else {
                    const value32 = value31.addEventListener;
                    valueResult23 = value32.call(value31, "change", function handleChange() {
                        let valueResult25;
                        const items33 = [];
                        const part34 = Array.from((document.querySelector("#aiImage") as HTMLInputElement).files);
                        for (let index35 = 0; index35 < part34.length; index35++) {
                            items33.push(part34[index35]);
                        }
                        valueResult25 = items33;
                        const files = valueResult25;
                        const availableSlots = Math.max(0, 4 - selectedImages.length);
                        let valueResult27;
                        const items37 = files;
                        const result40 = [];
                        for (let index39 = 0; index39 < items37.length; index39++) {
                            let valueResult29;
                            {
                                const file = items37[index39];
                                if (file.size > 5 * 1024 * 1024) {
                                    showToast(("" + (file.name) + " 太大啦，请换一张不超过 5MB 的图片"));
                                    valueResult29 = false;
                                }
                                else {
                                    valueResult29 = true;
                                }
                            }
                            if (valueResult29) {
                                result40.push(items37[index39]);
                            }
                        }
                        valueResult27 = result40;
                        const validFiles = valueResult27.slice(0, availableSlots);
                        if (files.length > availableSlots) {
                            showToast("印小灵一次最多能抱住 4 张图片哦");
                        }
                        const items42 = validFiles;
                        for (let index44 = 0; index44 < items42.length; index44++) {
                            {
                                const file = items42[index44];
                                selectedImages.push({
                                    id: ("" + (Date.now()) + "-" + (Math.random())),
                                    file: file,
                                    previewUrl: URL.createObjectURL(file),
                                });
                            }
                        }
                        (document.querySelector("#aiImage") as HTMLInputElement).value = "";
                        renderSelectedImages();
                    });
                }
                let valueResult35;
                const value48 = (document.querySelector("#uploadThumbnails") as HTMLElement);
                if (value48 === null || value48 === undefined) {
                    valueResult35 = undefined;
                }
                else {
                    const value49 = value48.addEventListener;
                    valueResult35 = value49.call(value48, "click", function handleClick(event) {
                        const button = ((event.target as HTMLElement).closest("[data-remove-image]") as HTMLElement);
                        if (!button) {
                            return;
                        }
                        let valueResult37;
                        {
                            let searchFinished38 = false;
                            const items50 = selectedImages;
                            for (let index52 = 0; !searchFinished38 && index52 < items50.length; index52++) {
                                let valueResult39;
                                {
                                    const item = items50[index52];
                                    valueResult39 = item.id === button.dataset.removeImage;
                                }
                                if (valueResult39) {
                                    valueResult37 = index52;
                                    searchFinished38 = true;
                                }
                            }
                            if (!searchFinished38) {
                                valueResult37 = -1;
                                searchFinished38 = true;
                            }
                        }
                        const index = valueResult37;
                        if (index < 0) {
                            return;
                        }
                        URL.revokeObjectURL(selectedImages[index].previewUrl);
                        selectedImages.splice(index, 1);
                        renderSelectedImages();
                    });
                }
                let valueResult41;
                const value56 = (document.querySelector("#clearImages") as HTMLButtonElement);
                if (value56 === null || value56 === undefined) {
                    valueResult41 = undefined;
                }
                else {
                    const value57 = value56.addEventListener;
                    valueResult41 = value57.call(value56, "click", clearSelectedImages);
                }
                let valueResult43;
                const value59 = (document.querySelector("#clearChat") as HTMLButtonElement);
                if (value59 === null || value59 === undefined) {
                    valueResult43 = undefined;
                }
                else {
                    const value60 = value59.addEventListener;
                    valueResult43 = value60.call(value59, "click", function handleClick() {
                        (document.querySelector("#chatMessages") as HTMLElement).innerHTML =
                            '<div class="chat-message assistant">小黑板擦干净啦！重新开始吧，想聊封泥或别的小问题都可以。</div>';
                        sessionId = "";
                        window.sessionStorage.removeItem(sessionStorageKey);
                        clearSelectedImages();
                    });
                }
            }
            return { init: init, renderStatus: renderStatus };
        },
    };
})();
window.NiyunAiChat = NiyunAiChat;
