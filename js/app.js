(function () {
  // ==================== 01. 通用工具和页面状态 ====================
  // $ 查找一个元素，$$ 查找多个元素并转成数组，后面所有板块都会使用。
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  let courses = [];
  let visibleSites = [];
  let selectedImages = [];
  // 一轮问答只维护这一份状态，避免题号、分数和按钮阶段彼此不同步。
  const quizState = { questions: [], index: 0, score: 0, scorePerQuestion: 10, answered: false };
  let aiSessionId = window.sessionStorage.getItem("nimeng-ai-session") || "";

  /*
   * ==================== 显示设置参数区 ====================
   * 调整设置范围、默认值和每档效果时，只修改这里，不要到事件函数里寻找数字。
   */
  const settingsStorageKey = "nimeng-display-settings";
  const systemPrefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 导航时钟与弹窗动画：时间单位均为毫秒。
  const interfaceConfig = {
    clockLocale: "zh-CN",
    clockRefreshInterval: 1000,
    clockFormat: { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }
  };

  function readCssTime(variableName) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    return value.endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000;
  }

  function readCssValue(variableName) {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  }

  function runElementAnimation(element, keyframes, durationVariable, easingVariable) {
    if (!element) return null;
    element.getAnimations().forEach((animation) => animation.cancel());
    const duration = systemPrefersReducedMotion ? 1 : readCssTime(durationVariable);
    return element.animate(keyframes, {
      duration,
      easing: readCssValue(easingVariable),
      fill: "both"
    });
  }

  // 阅读设置：每个可选项对应的实际字号和行距。
  const readerSettingOptions = {
    fontSize: {
      small: "0.82rem",
      standard: "0.9rem",
      large: "1rem"
    },
    lineHeight: {
      compact: "1.6",
      comfortable: "1.8",
      loose: "2"
    }
  };

  // 动态设置：范围、步长、默认值和单位相互独立，便于以后分别调整。
  const motionSettingRanges = {
    pageMotion: { min: 0, max: 100, step: 10, defaultValue: 60, unit: "%" },
    cardTilt: { min: 0, max: 6, step: 0.5, defaultValue: 4, unit: "°" },
    backgroundDust: { min: 0, max: 64, step: 4, defaultValue: 16, unit: "粒" }
  };

  // 动态设置到底层视觉参数的换算边界。
  const motionSettingEffects = {
    cardLiftMax: 5
  };

  const defaultSettings = {
    fontSize: "standard",
    lineHeight: "comfortable",
    motionIntensity: systemPrefersReducedMotion ? motionSettingRanges.pageMotion.min : motionSettingRanges.pageMotion.defaultValue,
    tiltDegrees: systemPrefersReducedMotion ? motionSettingRanges.cardTilt.min : motionSettingRanges.cardTilt.defaultValue,
    dustQuantity: systemPrefersReducedMotion ? motionSettingRanges.backgroundDust.min : motionSettingRanges.backgroundDust.defaultValue
  };
  let userSettings = { ...defaultSettings };
  let settingsNeedMigration = false;

  try {
    const savedSettings = JSON.parse(window.localStorage.getItem(settingsStorageKey) || "{}");
    // 兼容旧版“微尘强度 0～100%”：按比例迁移为“微尘数量 0～32 粒”。
    if (savedSettings.dustQuantity === undefined && savedSettings.dustIntensity !== undefined) {
      savedSettings.dustQuantity = Math.round((Number(savedSettings.dustIntensity) / 100) * motionSettingRanges.backgroundDust.max / motionSettingRanges.backgroundDust.step) * motionSettingRanges.backgroundDust.step;
      settingsNeedMigration = true;
    }
    delete savedSettings.dustIntensity;
    userSettings = { ...defaultSettings, ...savedSettings };
  } catch (_) {
    userSettings = { ...defaultSettings };
  }

  /* 必须由 JavaScript 计算的动态视觉参数；CSS 外观参数统一放在 tokens.css。 */
  const visualEffects = {
    rippleLifetime: 600,       // 点击波纹保留时间（毫秒）
    searchFocusDelay: 700,     // 平滑滚动后移动焦点的等待时间（毫秒）
    searchHighlightLifetime: 1900, // 搜索目标描边保留时间（毫秒）
    cardTiltDegrees: motionSettingRanges.cardTilt.defaultValue, // 运行时由“卡片倾斜角度”设置更新
    cardPerspective: 800,      // 卡片 3D 透视距离
    cardLift: Math.min(motionSettingEffects.cardLiftMax, motionSettingRanges.cardTilt.defaultValue), // 随倾斜角度联动
    dustMaxParticles: motionSettingRanges.backgroundDust.max, // 粒子池数量，单位：粒
    dustSizeMin: 0.8,          // 微尘最小半径
    dustSizeRange: 2.2,        // 微尘半径随机增量
    dustHorizontalSpeed: 0.35, // 微尘水平漂移速度
    dustVerticalSpeedMin: 0.15,// 微尘最小下落速度
    dustVerticalSpeedRange: 0.4,// 微尘下落速度随机增量
    dustOpacityMin: 0.15,      // 单粒微尘最低透明度
    dustOpacityRange: 0.45,    // 单粒微尘透明度随机增量
    dustPrimaryColor: "168, 51, 42", // 主要朱砂色 RGB
    dustAccentColor: "212, 175, 55", // 少量金色 RGB
    dustPrimaryRatio: 0.6      // 朱砂微尘占比
  };

  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  const prefersReducedMotion = () => systemPrefersReducedMotion || Number(userSettings.motionIntensity) === 0;
  const clampNumber = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  };

  function normalizeSettings(settings) {
    return {
      fontSize: Object.hasOwn(readerSettingOptions.fontSize, settings.fontSize) ? settings.fontSize : defaultSettings.fontSize,
      lineHeight: Object.hasOwn(readerSettingOptions.lineHeight, settings.lineHeight) ? settings.lineHeight : defaultSettings.lineHeight,
      motionIntensity: clampNumber(settings.motionIntensity, motionSettingRanges.pageMotion.min, motionSettingRanges.pageMotion.max, defaultSettings.motionIntensity),
      tiltDegrees: clampNumber(settings.tiltDegrees, motionSettingRanges.cardTilt.min, motionSettingRanges.cardTilt.max, defaultSettings.tiltDegrees),
      dustQuantity: clampNumber(settings.dustQuantity, motionSettingRanges.backgroundDust.min, motionSettingRanges.backgroundDust.max, defaultSettings.dustQuantity)
    };
  }

  function applyDisplaySettings(save = true) {
    userSettings = normalizeSettings(userSettings);
    const root = document.documentElement;
    const motionScale = userSettings.motionIntensity / motionSettingRanges.pageMotion.max;

    root.dataset.readerSize = userSettings.fontSize;
    root.dataset.lineHeight = userSettings.lineHeight;
    root.dataset.motion = String(userSettings.motionIntensity);
    root.style.setProperty("--reader-font-size", readerSettingOptions.fontSize[userSettings.fontSize]);
    root.style.setProperty("--reader-line-height", readerSettingOptions.lineHeight[userSettings.lineHeight]);
    root.style.setProperty("--user-motion-scale", String(motionScale));

    visualEffects.cardTiltDegrees = userSettings.tiltDegrees;
    visualEffects.cardLift = userSettings.tiltDegrees ? Math.min(motionSettingEffects.cardLiftMax, userSettings.tiltDegrees) : 0;
    if (save) window.localStorage.setItem(settingsStorageKey, JSON.stringify(userSettings));
  }

  userSettings = normalizeSettings(userSettings);
  applyDisplaySettings(false);
  if (settingsNeedMigration) window.localStorage.setItem(settingsStorageKey, JSON.stringify(userSettings));
  const getKnowledge = () => window.SEAL_KNOWLEDGE || window.PPT_KNOWLEDGE;
  const getSiteSearchValues = (site) => [site.city, site.name, site.period, site.admin, site.note, ...(site.tags || []), ...site.seals];
  const findKnowledgeSites = (keyword = "") => {
    const query = keyword.trim().toLowerCase();
    const sites = getKnowledge()?.sites || [];
    return query ? sites.filter((site) => getSiteSearchValues(site).some((value) => String(value).toLowerCase().includes(query))) : sites;
  };

  // AI 回复会包含少量 Markdown。先转义 HTML，再只开放常用格式，避免插入恶意标签。
  function renderInlineMarkdown(text) {
    return escapeHtml(text)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }

  function renderMarkdown(markdown) {
    const source = String(markdown || "").replace(/\r\n?/g, "\n");
    const codeBlocks = [];
    const protectedSource = source.replace(/```(?:[\w-]+)?\n?([\s\S]*?)```/g, (_, code) => {
      const token = `@@CODE_BLOCK_${codeBlocks.length}@@`;
      codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
      return token;
    });
    const output = [];
    let listType = "";

    function closeList() {
      if (listType) output.push(`</${listType}>`);
      listType = "";
    }

    protectedSource.split("\n").forEach((line) => {
      const trimmed = line.trim();
      const unordered = trimmed.match(/^[-*+]\s+(.+)/);
      const ordered = trimmed.match(/^\d+[.)]\s+(.+)/);
      const heading = trimmed.match(/^(#{1,3})\s+(.+)/);

      if (unordered || ordered) {
        const nextType = unordered ? "ul" : "ol";
        if (listType !== nextType) { closeList(); output.push(`<${nextType}>`); listType = nextType; }
        output.push(`<li>${renderInlineMarkdown((unordered || ordered)[1])}</li>`);
        return;
      }

      closeList();
      if (!trimmed) return;
      if (/^@@CODE_BLOCK_\d+@@$/.test(trimmed)) output.push(trimmed);
      else if (heading) output.push(`<h${heading[1].length}>${renderInlineMarkdown(heading[2])}</h${heading[1].length}>`);
      else output.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
    });
    closeList();
    return output.join("").replace(/@@CODE_BLOCK_(\d+)@@/g, (_, index) => codeBlocks[Number(index)] || "");
  }

  // 页面右下角的短提示，2.6 秒后自动隐藏。
  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
  }

  // 两个搜索框共用同一种清除反馈，避免重复维护 class 切换时序。
  function replayClearFeedback(input, wrapperSelector) {
    const wrapper = input.closest(wrapperSelector);
    wrapper?.classList.remove("is-cleared");
    window.requestAnimationFrame(() => wrapper?.classList.add("is-cleared"));
    input.focus();
  }

  // ==================== 02. 藏品、地图、课程和文创内容渲染 ====================
  // 有实物图时显示图片；没有图片时根据印文生成简单的数字复原图。
  function createRelicVisual(item) {
    if (item.imageUrl) {
      return `<div class="relic-visual has-image" aria-label="${item.name}实物资料图"><img src="${item.imageUrl}" alt="${item.name}"><span class="relic-code">${item.id}</span></div>`;
    }
    const chars = [...item.inscription].slice(0, 4);
    while (chars.length < 4) chars.push("印");
    return `<div class="relic-visual ${item.tone}" aria-label="${item.name}数字复原图"><div class="relic-disc"><div class="mini-inscription">${chars.map((char) => `<span>${char}</span>`).join("")}</div></div><span class="relic-code">${item.id}</span></div>`;
  }

  function renderRelics(items) {
    $("#collectionGrid").innerHTML = items.length ? items.map((item) => `<article class="relic-card" data-relic-card="${item.id}" tabindex="-1">${createRelicVisual(item)}<div class="relic-info"><div><span>${item.period}</span><span>${item.value}</span></div><h3>${item.name}</h3><p>${item.summary}</p><button type="button" data-relic-id="${item.id}">查看调研档案 <span>→</span></button></div></article>`).join("") : '<div class="empty-state"><strong>暂未找到相关封泥</strong><p>换一个名称、年代或地点试试。</p></div>';
  }

  // 点击地图点位后，把该地点的信息写入右侧详情面板。
  function updateSitePanel(site, index = 0) {
    $("#siteNumber").textContent = String(index + 1).padStart(2, "0");
    $("#siteCity").textContent = site.city;
    $("#siteName").textContent = site.name;
    const description = $("#siteDescription");
    description.textContent = site.description;
    // 说明区域独立滚动；切换地点时回到开头，避免继承上一地点的滚动位置。
    description.scrollTop = 0;
    $("#sitePeriod").textContent = site.period;
    $("#siteCount").textContent = `${site.count} 条`;
  }

  function renderSites(sites) {
    visibleSites = sites;
    const root = $("#mapMarkers");
    root.innerHTML = sites.map((site, index) => `<button class="map-marker${index === 0 ? " active" : ""}" type="button" style="left:${site.x}%;top:${site.y}%" data-site-id="${site.id}" aria-label="查看${site.city}"><i></i><span>${site.city.split(" · ")[0]}</span></button>`).join("");
    if (sites.length) updateSitePanel(sites[0]);
  }

  // 切换当前选中的课程，并同步更新主课程区域。
  function selectCourse(id) {
    const course = courses.find((item) => item.id === id) || courses[0];
    if (!course) return;
    $("#courseMeta").textContent = `第 ${course.lesson} 课 · ${course.duration}`;
    $("#courseTitle").textContent = course.title;
    $("#courseDescription").textContent = course.description;
    $$("[data-course-id]").forEach((button) => button.classList.toggle("active", button.dataset.courseId === course.id));
    const player = $("#coursePlayer");
    player.dataset.videoUrl = course.videoUrl;
    if (course.posterUrl) player.style.backgroundImage = `url("${course.posterUrl}")`;
  }

  function renderCourses(items) {
    courses = items;
    $("#courseList").innerHTML = items.map((course) => `<button type="button" data-course-id="${course.id}"><span>0${course.lesson}</span><div><strong>${course.title}</strong><small>${course.duration} · 开源研学课程</small></div><i>→</i></button>`).join("");
    selectCourse(items[0]?.id);
  }

  function renderCreativeWorks(items) {
    const grid = $("#creativeGrid");
    if (!grid) return;
    grid.innerHTML = items.map((item, index) => `<article class="creative-card creative-${index + 1}"><div class="creative-art"><span>${item.mark}</span><i>${String(index + 1).padStart(2, "0")}</i></div><div><small>${item.category}</small><h3>${item.name}</h3><p>${item.description}</p></div></article>`).join("");
  }

  const quizOptionKeys = ["A", "B", "C", "D"];

  function shuffleQuizOptions(question) {
    // value 保留数据库原答案键；displayKey 是本轮打乱后显示给用户的字母。
    const options = quizOptionKeys.map((originalKey) => ({ originalKey, text: question[`option${originalKey}`] }));
    for (let index = options.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [options[index], options[randomIndex]] = [options[randomIndex], options[index]];
    }
    return options.map((option, index) => ({ ...option, displayKey: quizOptionKeys[index] }));
  }

  // 任一选项超过该长度时改成四行单列，避免长句被两列布局压得难以阅读。
  function hasLongQuizOption(question) {
    return quizOptionKeys.some((key) => String(question[`option${key}`] || "").length > 28);
  }

  function getQuizTitle(score) {
    if (score === 100) return "金石通识者";
    if (score >= 80) return "封泥学士";
    if (score >= 60) return "泥印新秀";
    return "澄泥初识";
  }

  function updateQuizProgress() {
    const total = quizState.questions.length;
    const completed = Math.min(quizState.index + (quizState.answered ? 1 : 0), total);
    const ratio = total ? completed / total : 0;
    $("#quizProgressCount").textContent = `${completed} / ${total}`;
    $("#quizProgressBar").style.transform = `scaleX(${ratio})`;
    $("#quizScore").textContent = String(quizState.score);
  }

  function renderCurrentQuizQuestion() {
    const list = $("#quizList");
    list.classList.remove("is-result");
    list.setAttribute("aria-busy", "false");
    const question = quizState.questions[quizState.index];
    if (!question) return renderQuizResult();
    list.innerHTML = `
      <fieldset class="quiz-question" data-question-id="${question.id}">
        <legend class="sr-only">第 ${quizState.index + 1} 题：${escapeHtml(question.question)}</legend>
        <div class="quiz-question-title"><span class="quiz-question-number">${String(quizState.index + 1).padStart(2, "0")}</span><span class="quiz-difficulty" data-difficulty="${escapeHtml(question.difficulty || "简单")}">${escapeHtml(question.difficulty || "简单")}</span><h3>${escapeHtml(question.question)}</h3></div>
        <div class="quiz-options${question.hasLongOption ? " has-long-option" : ""}">
          ${question.displayOptions.map((option) => `<label><input type="radio" name="quiz-${question.id}" value="${option.originalKey}" data-display-key="${option.displayKey}"><span class="quiz-option-key">${option.displayKey}</span><span>${escapeHtml(option.text)}</span></label>`).join("")}
        </div>
        <div class="quiz-explanation" hidden></div>
      </fieldset>
    `;
    quizState.answered = false;
    $("#quizFeedback").textContent = "选择一个答案，然后确认。";
    $("#submitQuiz").disabled = true;
    $("#submitQuiz").firstChild.textContent = "确认答案 ";
    const resetButton = $("#resetQuiz");
    const actions = $(".quiz-actions");
    if (resetButton && actions && resetButton.parentElement !== actions) actions.appendChild(resetButton);
    resetButton.hidden = false;
    updateQuizProgress();
  }

  function renderQuizResult() {
    const score = quizState.score;
    const title = getQuizTitle(score);
    quizState.answered = true;
    const correctCount = score / quizState.scorePerQuestion;
    const list = $("#quizList");
    list.classList.add("is-result");
    list.innerHTML = `<div class="quiz-result"><span>本轮称号</span><h3>${title}</h3><strong>${score}<small>分</small></strong><p>共答对 ${correctCount} / ${quizState.questions.length} 题。每一次辨认，都是走近齐鲁金石的一步。</p><button class="button quiz-share-button" id="shareQuiz" type="button">分享成绩 <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 8l5-5m0 0v4m0-4h-4"/><path d="M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5"/></svg></button></div>`;
    $("#quizFeedback").textContent = "";
    $("#submitQuiz").hidden = true;
    const resetButton = $("#resetQuiz");
    resetButton.hidden = false;
    $(".quiz-result")?.appendChild(resetButton);
    updateQuizProgress();
  }

  function startQuiz(round) {
    quizState.questions = round.questions.map((question) => ({
      ...question,
      hasLongOption: hasLongQuizOption(question),
      displayOptions: shuffleQuizOptions(question)
    }));
    quizState.index = 0;
    quizState.score = 0;
    quizState.scorePerQuestion = round.scorePerQuestion;
    quizState.answered = false;
    $("#submitQuiz").hidden = false;
    renderCurrentQuizQuestion();
  }

  async function loadQuiz() {
    const list = $("#quizList");
    list.setAttribute("aria-busy", "true");
    list.innerHTML = '<p class="quiz-loading">正在随机抽取十道题……</p>';
    try {
      startQuiz(await ApiService.startQuiz());
    } catch (error) {
      list.setAttribute("aria-busy", "false");
      list.innerHTML = `<div class="empty-state"><strong>题目加载失败</strong><p>${escapeHtml(error.message || "请稍后重试")}</p></div>`;
      $("#quizFeedback").textContent = "题库暂时无法访问。";
      updateQuizProgress();
    }
  }

  async function submitQuiz(event) {
    event.preventDefault();
    if (!quizState.questions.length) return;
    if (quizState.answered) {
      quizState.index += 1;
      if (quizState.index >= quizState.questions.length) renderQuizResult();
      else renderCurrentQuizQuestion();
      return;
    }

    const question = quizState.questions[quizState.index];
    const selected = $(`input[name="quiz-${question.id}"]:checked`);
    if (!selected) return;
    const submitButton = $("#submitQuiz");
    submitButton.disabled = true;
    submitButton.firstChild.textContent = "正在判题 ";
    $("#quizForm").setAttribute("aria-busy", "true");
    try {
      const item = await ApiService.answerQuiz(question.id, selected.value);
      quizState.answered = true;
      quizState.score += item.earnedScore;
      const fieldset = $(`[data-question-id="${item.questionId}"]`);
      fieldset.classList.add(item.correct ? "is-correct" : "is-wrong");
      fieldset.querySelectorAll("input").forEach((input) => { input.disabled = true; });
      const correctInput = fieldset.querySelector(`input[value="${item.correctAnswer}"]`);
      const correctDisplayKey = correctInput?.dataset.displayKey || item.correctAnswer;
      const correctLabel = correctInput?.closest("label");
      correctLabel?.classList.add("is-answer");
      const explanation = fieldset.querySelector(".quiz-explanation");
      explanation.hidden = false;
      explanation.innerHTML = `<strong>${item.correct ? `回答正确，答案 ${escapeHtml(correctDisplayKey)}，本题获得 ${item.earnedScore} 分` : `回答错误，正确答案是 ${escapeHtml(correctDisplayKey)}`}</strong><p>${escapeHtml(item.explanation)}</p>`;
      const questionTitle = fieldset.querySelector(".quiz-question-title h3");
      if (questionTitle && !questionTitle.querySelector(".quiz-analysis-hint")) {
        questionTitle.insertAdjacentHTML("beforeend", '<span class="quiz-analysis-hint">【下滑查看详细解析】</span>');
      }
      $("#quizFeedback").textContent = item.correct ? `当前得分 ${quizState.score} 分。` : `当前得分 ${quizState.score} 分，看看解析再继续。`;
      submitButton.firstChild.textContent = quizState.index === quizState.questions.length - 1 ? "查看结果 " : "下一题 ";
      submitButton.disabled = false;
      updateQuizProgress();
    } catch (error) {
      $("#quizFeedback").textContent = error.message || "提交失败，请稍后重试。";
      submitButton.firstChild.textContent = "确认答案 ";
      submitButton.disabled = false;
    } finally {
      $("#quizForm").setAttribute("aria-busy", "false");
    }
  }

  async function resetQuiz() {
    const resetButton = $("#resetQuiz");
    const actions = $(".quiz-actions");
    if (resetButton && actions) actions.appendChild(resetButton);
    await loadQuiz();
  }

  // 将 ppt-knowledge.js 中整理的研究发现写入页面。
  function renderSourceFindings() {
    const knowledge = getKnowledge();
    if (!knowledge || !knowledge.findings) return;
    $("#sourceFindings").innerHTML = knowledge.findings.map((item, index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></article>`).join("");
  }

  // 主页面精选与弹窗完整列表共用同一份卡片模板。
  function sourceCardTemplate(site) {
    return `<article data-source-card="${site.id}" tabindex="-1"><div><span>${escapeHtml(site.city)}</span><strong>${escapeHtml(site.seals.slice(0, 3).join(" · "))}${site.seals.length > 3 ? ` 等 ${site.count} 条` : ""}</strong></div><p>${escapeHtml(site.period)}<br>${escapeHtml(site.admin)}</p><a href="#map" data-source-site="${site.id}">在地图查看 <b aria-hidden="true">→</b></a></article>`;
  }

  function renderSourceCards(root, items) {
    root.innerHTML = items.length
      ? items.map(sourceCardTemplate).join("")
      : '<p class="source-empty">没有匹配资料，请尝试现代区县、古地名、印文或郡国名称。</p>';
  }

  // 页面只展示前三处；完整筛选结果只在弹窗中渲染。
  function renderSourcePreview() {
    const sites = getKnowledge()?.sites || [];
    renderSourceCards($("#sourceIndex"), sites.slice(0, 3));
    $("#sourceSearchFeedback").textContent = `显示精选 ${Math.min(3, sites.length)} 处区县资料`;
    $("#openSourceIndex").firstChild.textContent = `查看其余 ${Math.max(0, sites.length - 3)} 处资料 `;
  }

  function renderSourceDialogIndex(keyword = "") {
    const query = keyword.trim().toLowerCase();
    const items = findKnowledgeSites(query);
    renderSourceCards($("#sourceDialogIndex"), items);
    $("#clearSourceDialogSearch").hidden = !query;
    $("#sourceDialogFeedback").textContent = query ? `找到 ${items.length} 处匹配资料` : `显示全部 ${items.length} 处区县资料`;
  }

  // ==================== 03. 数字手卷交互 ====================
  // 支持按钮、方向键、鼠标滚轮和拖动；每次移动后同步幕数和进度条。
  function initScrollStory() {
    const viewport = $("#scrollViewport");
    if (!viewport) return;
    const track = $("#scrollTrack");
    const panels = $$(".scroll-panel", viewport);
    const previous = $("#scrollPrev");
    const next = $("#scrollNext");
    const progress = $("#scrollProgress");
    const status = $("#scrollStatus");
    let activeIndex = 0;
    let dragging = false;
    let dragStart = 0;
    let scrollStart = 0;
    let chapterStops = [];

    // 重新计算每一幕居中时的横向位置，窗口尺寸变化后也要重新计算。
    function refreshChapterStops() {
      const firstPanel = panels[0];
      const lastPanel = panels[panels.length - 1];
      track.style.paddingInlineStart = `${Math.max(0, (viewport.clientWidth - firstPanel.offsetWidth) / 2)}px`;
      track.style.paddingInlineEnd = `${Math.max(0, (viewport.clientWidth - lastPanel.offsetWidth) / 2)}px`;
      const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      const viewportRect = viewport.getBoundingClientRect();
      chapterStops = panels.map((panel) => {
        const panelRect = panel.getBoundingClientRect();
        const panelStart = panelRect.left - viewportRect.left + viewport.scrollLeft;
        const centered = panelStart - (viewport.clientWidth - panelRect.width) / 2;
        return Math.max(0, Math.min(centered, max));
      });
    }

    function updateStory() {
      const max = Math.max(1, viewport.scrollWidth - viewport.clientWidth);
      const ratio = Math.min(1, viewport.scrollLeft / max);
      progress.style.transform = `scaleX(${Math.max(.02, ratio)})`;
      const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
      activeIndex = panels.reduce((closest, panel, index) => {
        const panelCenter = panel.offsetLeft + panel.offsetWidth / 2;
        const closestCenter = panels[closest].offsetLeft + panels[closest].offsetWidth / 2;
        return Math.abs(panelCenter - viewportCenter) < Math.abs(closestCenter - viewportCenter) ? index : closest;
      }, 0);
      status.innerHTML = `<span>${escapeHtml(panels[activeIndex].dataset.scrollTitle || "展卷")}</span><b>${String(activeIndex + 1).padStart(2, "0")} / ${String(panels.length).padStart(2, "0")}</b>`;
      panels.forEach((panel, index) => panel.toggleAttribute("data-current", index === activeIndex));
      previous.disabled = viewport.scrollLeft <= 1;
      next.disabled = viewport.scrollLeft >= max - 1;
    }

    function moveToChapter(direction) {
      const tolerance = 4;
      const current = viewport.scrollLeft;
      const target = direction > 0
        ? chapterStops.find((stop) => stop > current + tolerance)
        : [...chapterStops].reverse().find((stop) => stop < current - tolerance);
      if (target === undefined) return;
      viewport.scrollTo({ left: target, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }

    function moveToEdge(edge) {
      viewport.scrollTo({ left: edge === "start" ? 0 : viewport.scrollWidth, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }

    previous.addEventListener("click", () => moveToChapter(-1));
    next.addEventListener("click", () => moveToChapter(1));
    viewport.addEventListener("scroll", updateStory, { passive: true });
    viewport.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") { event.preventDefault(); moveToChapter(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); moveToChapter(1); }
      if (event.key === "Home") { event.preventDefault(); moveToEdge("start"); }
      if (event.key === "End") { event.preventDefault(); moveToEdge("end"); }
    });
    viewport.addEventListener("wheel", (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const atStart = viewport.scrollLeft <= 0 && event.deltaY < 0;
      const atEnd = viewport.scrollLeft >= viewport.scrollWidth - viewport.clientWidth - 1 && event.deltaY > 0;
      if (atStart || atEnd) return;
      event.preventDefault();
      viewport.scrollLeft += event.deltaY;
    }, { passive: false });
    viewport.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") return;
      dragging = true; dragStart = event.clientX; scrollStart = viewport.scrollLeft;
      viewport.setPointerCapture(event.pointerId); viewport.classList.add("is-dragging");
    });
    viewport.addEventListener("pointermove", (event) => { if (dragging) viewport.scrollLeft = scrollStart - (event.clientX - dragStart); });
    viewport.addEventListener("pointerup", (event) => { dragging = false; viewport.releasePointerCapture(event.pointerId); viewport.classList.remove("is-dragging"); });
    viewport.addEventListener("pointercancel", () => { dragging = false; viewport.classList.remove("is-dragging"); });
    window.addEventListener("resize", () => { refreshChapterStops(); updateStory(); });
    refreshChapterStops();
    updateStory();
  }

  // ==================== 04. 页面初始化 ====================
  // 同时读取各板块数据，完成首轮渲染，最后检查 AI 后端是否在线。
  async function init() {
    const [stats, mapConfig, sites, relics, courseItems, creativeItems] = await Promise.all([ApiService.getStats(), ApiService.getMapConfig(), ApiService.getSites(), ApiService.getRelics(), ApiService.getCourses(), ApiService.getCreativeWorks()]);
    $("#statRelics").textContent = stats.relics;
    $("#statSites").textContent = stats.sites;
    $("#statCourses").textContent = stats.courses;
    if (mapConfig.imageUrl) {
      const image = $("#mapSourceImage");
      image.src = mapConfig.imageUrl;
      image.hidden = false;
      $("#shandongMap").classList.add("has-source-image");
    }
    renderSites(sites);
    renderRelics(relics.items);
    renderCourses(courseItems);
    renderCreativeWorks(creativeItems);
    await loadQuiz();
    renderSourceFindings();
    renderSourcePreview();
    initScrollStory();
    renderAiStatus(await AiService.getStatus());
  }

  // ==================== 05. 导航、地图筛选和课程事件 ====================
  $("#menuToggle").addEventListener("click", () => { const open = $("#mainNav").classList.toggle("open"); $("#menuToggle").setAttribute("aria-expanded", String(open)); });
  function getLayoutTop(element) {
    let top = 0;
    for (let current = element; current; current = current.offsetParent) top += current.offsetTop;
    return top;
  }

  // 使用不受栏目进退场 transform 影响的布局坐标，保证向上、向下跳转停在同一位置。
  $$("#mainNav a").forEach((link) => link.addEventListener("click", (event) => {
    const target = $(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    $("#mainNav").classList.remove("open");
    $("#menuToggle").setAttribute("aria-expanded", "false");
    const anchorOffset = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    window.scrollTo({ top: Math.max(0, getLayoutTop(target) - anchorOffset), behavior: prefersReducedMotion() ? "auto" : "smooth" });
    window.history.pushState(null, "", link.getAttribute("href"));
  }));
  $("#quizForm").addEventListener("change", (event) => {
    if (!quizState.answered && event.target.matches("input[type=radio]")) $("#submitQuiz").disabled = false;
  });
  $("#quizForm").addEventListener("submit", submitQuiz);
  $("#resetQuiz").addEventListener("click", resetQuiz);

  // 成绩分享只复制当前网址，不上传成绩或任何个人数据。
  const shareDialog = $("#shareDialog");
  const copyShareButton = $("#copyShareUrl");
  let sharePanelAnimation = null;
  let copyFeedbackTimer = null;

  // 搜索与分享弹窗共用同一组位移、缩放、时长和缓动参数。
  function openModalAnimation(panel) {
    return runElementAnimation(panel, [
      { opacity: 0, transform: `translateY(${readCssValue("--motion-search-travel-y")}) scale(${readCssValue("--motion-search-scale-from")})` },
      { opacity: 1, transform: "translateY(0) scale(1)" }
    ], "--motion-search-enter", "--ease-out");
  }

  function closeModalAnimation(panel) {
    return runElementAnimation(panel, [
      { opacity: 1, transform: "translateY(0) scale(1)" },
      { opacity: 0, transform: `translateY(${readCssValue("--motion-search-travel-y")}) scale(${readCssValue("--motion-search-scale-from")})` }
    ], "--motion-search-exit", "--ease-in-out");
  }

  async function closeShareDialog() {
    if (!shareDialog?.open || shareDialog.classList.contains("is-closing")) return;
    shareDialog.classList.add("is-closing");
    sharePanelAnimation = closeModalAnimation(shareDialog.querySelector(".share-panel"));
    if (sharePanelAnimation) {
      try { await sharePanelAnimation.finished; } catch (_) { return; }
    }
    shareDialog.classList.remove("is-closing");
    shareDialog.close();
  }

  function openShareDialog() {
    const score = quizState.score;
    const correctCount = score / quizState.scorePerQuestion;
    $("#shareTitle").textContent = getQuizTitle(score);
    $("#shareSummary").textContent = `本轮得分 ${score} 分，答对 ${correctCount} / ${quizState.questions.length} 题。`;
    $("#shareUrl").textContent = window.location.href;
    $("#shareFeedback").textContent = "分享网址后，朋友可以打开同一个趣味问答页面。";
    copyShareButton.textContent = "复制当前网址";
    copyShareButton.classList.remove("is-copied");
    window.clearTimeout(copyFeedbackTimer);
    shareDialog.classList.remove("is-closing");
    shareDialog.showModal();
    sharePanelAnimation = openModalAnimation(shareDialog.querySelector(".share-panel"));
    copyShareButton.focus();
  }

  $("#quizList")?.addEventListener("click", (event) => {
    if (event.target.closest("#shareQuiz")) openShareDialog();
  });

  $("#closeShare")?.addEventListener("click", closeShareDialog);
  shareDialog?.addEventListener("click", (event) => { if (event.target === shareDialog) closeShareDialog(); });
  shareDialog?.addEventListener("cancel", (event) => { event.preventDefault(); closeShareDialog(); });
  shareDialog?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); closeShareDialog(); }
  });
  shareDialog?.addEventListener("close", () => $("#shareQuiz")?.focus());

  copyShareButton?.addEventListener("click", async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
      else {
        const input = document.createElement("textarea");
        input.value = url;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      window.clearTimeout(copyFeedbackTimer);
      copyShareButton.classList.remove("is-copied");
      // 强制重新触发状态样式，连续复制时也能获得清晰反馈。
      void copyShareButton.offsetWidth;
      copyShareButton.classList.add("is-copied");
      copyShareButton.textContent = "已复制";
      $("#shareFeedback").textContent = "网址已复制，可以发送给朋友了。";
      copyFeedbackTimer = window.setTimeout(() => {
        copyShareButton.classList.remove("is-copied");
        copyShareButton.textContent = "复制当前网址";
        $("#shareFeedback").textContent = "可再次点击复制当前网址。";
      }, 1600);
    } catch {
      $("#shareFeedback").textContent = "复制失败，请手动选择上方网址。";
    }
  });

  // 导航栏时钟：使用本机时间，每秒检查一次，显示为 24 小时制 HH:mm。
  const headerClock = $("#headerClock");
  function updateHeaderClock() {
    if (!headerClock) return;
    const now = new Date();
    headerClock.dateTime = now.toISOString();
    headerClock.textContent = new Intl.DateTimeFormat(interfaceConfig.clockLocale, interfaceConfig.clockFormat).format(now);
  }
  updateHeaderClock();
  window.setInterval(updateHeaderClock, interfaceConfig.clockRefreshInterval);

  // 导航栏显示设置：即时预览、自动保存，并在关闭后把键盘焦点交还给设置按钮。
  const settingsDialog = $("#settingsDialog");
  const settingsForm = $("#settingsForm");
  const openSettingsButton = $("#openSettings");
  let settingsPanelAnimation = null;
  const settingOutputs = {
    motionIntensity: $("#motionValue"),
    tiltDegrees: $("#tiltValue"),
    dustQuantity: $("#dustValue")
  };

  function describeMotion(value) {
    if (value === 0) return "0%，关闭空间位移";
    if (value <= 30) return `${value}%，轻微动效`;
    if (value <= 70) return `${value}%，标准动效`;
    return `${value}%，明显动效`;
  }

  function describeTilt(value) {
    if (value === 0) return "0 度，关闭卡片倾斜";
    if (value <= 2) return `${value} 度，轻微立体效果`;
    if (value <= 4) return `${value} 度，标准立体效果`;
    return `${value} 度，明显立体效果`;
  }

  function describeDust(value) {
    if (value === 0) return "0 粒，关闭背景微尘";
    if (value <= 8) return `${value} 粒，少量微尘`;
    if (value <= 20) return `${value} 粒，适量微尘`;
    return `${value} 粒，较多微尘`;
  }

  function syncSettingsForm() {
    if (!settingsForm) return;
    const fontOption = settingsForm.querySelector(`[name="fontSize"][value="${userSettings.fontSize}"]`);
    const lineOption = settingsForm.querySelector(`[name="lineHeight"][value="${userSettings.lineHeight}"]`);
    if (fontOption) fontOption.checked = true;
    if (lineOption) lineOption.checked = true;

    const rangeBindings = {
      motionIntensity: motionSettingRanges.pageMotion,
      tiltDegrees: motionSettingRanges.cardTilt,
      dustQuantity: motionSettingRanges.backgroundDust
    };
    Object.entries(rangeBindings).forEach(([name, range]) => {
      const input = settingsForm.elements[name];
      if (!input) return;
      input.min = String(range.min);
      input.max = String(range.max);
      input.step = String(range.step);
      input.value = String(userSettings[name]);
    });
    settingOutputs.motionIntensity.value = `${userSettings.motionIntensity}${motionSettingRanges.pageMotion.unit}`;
    settingOutputs.tiltDegrees.value = `${userSettings.tiltDegrees}${motionSettingRanges.cardTilt.unit}`;
    settingOutputs.dustQuantity.value = `${userSettings.dustQuantity} ${motionSettingRanges.backgroundDust.unit}`;
    settingsForm.elements.motionIntensity?.setAttribute("aria-valuetext", describeMotion(userSettings.motionIntensity));
    settingsForm.elements.tiltDegrees?.setAttribute("aria-valuetext", describeTilt(userSettings.tiltDegrees));
    settingsForm.elements.dustQuantity?.setAttribute("aria-valuetext", describeDust(userSettings.dustQuantity));
    $("#systemMotionNote").hidden = !systemPrefersReducedMotion;
  }

  function openSettingsAnimation() {
    const panel = settingsDialog?.querySelector(".settings-panel");
    settingsPanelAnimation = runElementAnimation(panel, [
      { clipPath: `inset(0 0 0 ${readCssValue("--motion-settings-reveal-start")})` },
      { clipPath: "inset(0 0 0 0)" }
    ], "--motion-settings-enter", "--ease-in-out");
  }

  async function closeSettingsAnimation() {
    const panel = settingsDialog?.querySelector(".settings-panel");
    settingsPanelAnimation = runElementAnimation(panel, [
      { clipPath: "inset(0 0 0 0)" },
      { clipPath: `inset(0 0 0 ${readCssValue("--motion-settings-reveal-start")})` }
    ], "--motion-settings-exit", "--ease-in-out");
    if (settingsPanelAnimation) {
      try { await settingsPanelAnimation.finished; } catch (_) { return false; }
    }
    return true;
  }

  async function closeSettingsDialog() {
    if (!settingsDialog?.open || settingsDialog.classList.contains("is-closing")) return;
    settingsDialog.classList.add("is-closing");
    const completed = await closeSettingsAnimation();
    if (!completed || !settingsDialog.open) return;
    settingsDialog.classList.remove("is-closing");
    settingsDialog.close();
  }

  openSettingsButton?.addEventListener("click", () => {
    syncSettingsForm();
    settingsDialog.classList.remove("is-closing");
    settingsDialog.showModal();
    openSettingsAnimation();
    openSettingsButton.setAttribute("aria-expanded", "true");
    window.setTimeout(() => $("#closeSettings")?.focus(), 50);
  });
  $("#closeSettings")?.addEventListener("click", closeSettingsDialog);
  $("#doneSettings")?.addEventListener("click", closeSettingsDialog);
  settingsDialog?.addEventListener("click", (event) => { if (event.target === settingsDialog) closeSettingsDialog(); });
  settingsDialog?.addEventListener("cancel", (event) => { event.preventDefault(); closeSettingsDialog(); });
  settingsDialog?.addEventListener("close", () => {
    openSettingsButton?.setAttribute("aria-expanded", "false");
    openSettingsButton?.focus();
  });

  settingsForm?.addEventListener("input", (event) => {
    const input = event.target;
    if (!input.name) return;
    userSettings[input.name] = input.type === "range" ? Number(input.value) : input.value;
    applyDisplaySettings();
    syncSettingsForm();
  });

  $("#resetSettings")?.addEventListener("click", () => {
    userSettings = { ...defaultSettings };
    applyDisplaySettings();
    syncSettingsForm();
    showToast("显示设置已恢复默认");
  });
  syncSettingsForm();

  // 地图按钮和搜索定位共用筛选入口，保证按钮状态与点位数据同步。
  async function applyMapFilter(period = "全部") {
    $$(".filter-chip").forEach((button) => button.classList.toggle("active", button.dataset.period === period));
    renderSites(await ApiService.getSites(period));
  }

  $$(".filter-chip").forEach((button) => button.addEventListener("click", () => applyMapFilter(button.dataset.period)));
  $("#mapMarkers").addEventListener("click", (event) => {
    const marker = event.target.closest(".map-marker");
    if (!marker) return;
    const root = event.currentTarget;
    $$(".map-marker", root).forEach((item) => item.classList.toggle("active", item === marker));
    const index = visibleSites.findIndex((site) => site.id === Number(marker.dataset.siteId));
    if (index >= 0) updateSitePanel(visibleSites[index], index);
  });
  $("#courseList").addEventListener("click", (event) => { const button = event.target.closest("[data-course-id]"); if (button) selectCourse(button.dataset.courseId); });
  const sourceDialog = $("#sourceDialog");
  const sourceDialogPanel = sourceDialog?.querySelector(".source-dialog-panel");
  const sourceDialogSearch = $("#sourceDialogSearch");
  const clearSourceDialogSearch = $("#clearSourceDialogSearch");

  async function closeSourceDialog() {
    if (!sourceDialog?.open || sourceDialog.classList.contains("is-closing")) return;
    sourceDialog.classList.add("is-closing");
    const animation = closeModalAnimation(sourceDialogPanel);
    if (animation) {
      try { await animation.finished; } catch (_) { return; }
    }
    sourceDialog.classList.remove("is-closing");
    sourceDialog.close();
  }

  // 主列表和完整弹窗都通过 data-source-site 跳转地图地点。
  function handleSourceSiteClick(event) {
    const link = event.target.closest("[data-source-site]");
    if (!link) return;
    const marker = $(`[data-site-id="${link.dataset.sourceSite}"]`);
    if (marker) window.setTimeout(() => marker.click(), 50);
    if (sourceDialog?.open) closeSourceDialog();
  }
  $("#sourceIndex").addEventListener("click", handleSourceSiteClick);
  $("#sourceDialogIndex").addEventListener("click", handleSourceSiteClick);

  // 完整图录弹窗只在打开后渲染，减少首页首次加载的 DOM 数量。
  $("#openSourceIndex").addEventListener("click", () => {
    renderSourceDialogIndex();
    sourceDialog.classList.remove("is-closing");
    sourceDialog.showModal();
    openModalAnimation(sourceDialogPanel);
    sourceDialogSearch.focus();
  });
  $("#closeSourceIndex").addEventListener("click", () => closeSourceDialog());
  sourceDialog.addEventListener("click", (event) => { if (event.target === sourceDialog) closeSourceDialog(); });
  sourceDialog.addEventListener("cancel", (event) => { event.preventDefault(); closeSourceDialog(); });
  sourceDialogSearch.addEventListener("input", (event) => renderSourceDialogIndex(event.target.value));
  clearSourceDialogSearch.addEventListener("click", () => {
    sourceDialogSearch.value = "";
    renderSourceDialogIndex();
    replayClearFeedback(sourceDialogSearch, ".source-search-wrap");
  });
  $("#playCourse").addEventListener("click", () => { const url = $("#coursePlayer").dataset.videoUrl; if (url) window.open(url, "_blank", "noopener"); else showToast("课程视频接口已预留，替换 videoUrl 后即可播放"); });

  // ==================== 06. 全站搜索弹窗 ====================
  const searchDialog = $("#searchDialog");
  const searchInput = $("#searchInput");
  const searchResults = $("#searchResults");
  const clearSearchButton = $("#clearSearch");
  const initialSearchMessage = "<p>输入关键词以检索封泥藏品、古地名与调研档案。</p>";
  let searchBoxAnimation = null;

  // 输入框有内容时显示清除按钮；为空时隐藏，避免出现无效操作。
  function updateSearchClearButton() {
    if (clearSearchButton) clearSearchButton.hidden = !searchInput?.value;
  }

  // 所有关闭方式共用同一个函数，防止关闭按钮、遮罩和结果点击行为不一致。
  function openSearchAnimation() {
    const box = searchDialog?.querySelector(".search-box");
    searchBoxAnimation = openModalAnimation(box);
  }

  async function closeSearchAnimation() {
    const box = searchDialog?.querySelector(".search-box");
    searchBoxAnimation = closeModalAnimation(box);
    if (searchBoxAnimation) {
      try { await searchBoxAnimation.finished; } catch (_) { return false; }
    }
    return true;
  }

  async function closeSearchDialog() {
    if (!searchDialog?.open || searchDialog.classList.contains("is-closing")) return;
    searchDialog.classList.add("is-closing");
    const completed = await closeSearchAnimation();
    if (!completed || !searchDialog.open) return;
    searchDialog.classList.remove("is-closing");
    searchDialog.close();
  }

  if ($("#openSearch") && searchDialog) {
    $("#openSearch").addEventListener("click", () => {
      searchDialog.classList.remove("is-closing");
      searchDialog.showModal();
      openSearchAnimation();
      updateSearchClearButton();
      window.setTimeout(() => searchInput?.focus(), 50);
    });
  }

  // 支持右上角按钮、点击灰色遮罩和浏览器原生 Esc 三种关闭方式。
  $("#closeSearch")?.addEventListener("click", closeSearchDialog);
  searchDialog?.addEventListener("click", (event) => { if (event.target === searchDialog) closeSearchDialog(); });
  searchDialog?.addEventListener("cancel", (event) => { event.preventDefault(); closeSearchDialog(); });
  searchDialog?.addEventListener("keydown", (event) => {
    // 部分内嵌浏览器不会自动触发 dialog 的 cancel 事件，因此显式处理 Escape。
    if (event.key === "Escape") { event.preventDefault(); closeSearchDialog(); }
  });
  searchDialog?.addEventListener("close", () => $("#openSearch")?.focus());

  searchInput?.addEventListener("input", updateSearchClearButton);
  // 清除后保留输入焦点，并用文字和短暂底色同时提供视觉反馈。
  clearSearchButton?.addEventListener("click", () => {
    searchInput.value = "";
    searchResults.innerHTML = '<p class="search-feedback">已清除搜索内容，可以输入新的关键词。</p>';
    updateSearchClearButton();
    replayClearFeedback(searchInput, ".search-input-wrap");
  });

  async function search() {
    if (!searchInput || !searchResults) return;
    const keyword = searchInput.value.trim();
    if (!keyword) { searchResults.innerHTML = initialSearchMessage; searchInput.focus(); return; }
    searchResults.innerHTML = "<p>正在检索封泥档案……</p>";
    const response = await ApiService.getRelics({ keyword });
    const query = keyword.toLowerCase();

    // 将 45 区县图录的地点、古县、行政归属、备注和全部印文一并纳入全站搜索。
    const sourceMatches = findKnowledgeSites(query);
    const total = response.total + sourceMatches.length;
    const relicGroup = response.items.length
      ? `<div class="search-result-group"><h3>代表藏品 <span>${response.total}</span></h3>${response.items.map((item) => `<button type="button" data-search-id="${item.id}"><strong>${item.name}</strong><span>${item.period} · ${item.location}</span></button>`).join("")}</div>`
      : "";
    const sourceGroup = sourceMatches.length
      ? `<div class="search-result-group"><h3>45区县金石图录 <span>${sourceMatches.length}</span></h3>${sourceMatches.map((site) => {
          const matchedSeals = site.seals.filter((seal) => seal.toLowerCase().includes(query));
          const detail = matchedSeals.length ? matchedSeals.slice(0, 2).join(" · ") : `${site.period} · ${site.admin}`;
          return `<button type="button" data-search-site-id="${site.id}"><strong>${escapeHtml(site.city)} · ${escapeHtml(site.name)}</strong><span>${escapeHtml(detail)}</span></button>`;
        }).join("")}</div>`
      : "";
    searchResults.innerHTML = total
      ? `<p class="search-count">共找到 ${total} 条相关档案，点击即可前往对应位置。</p>${relicGroup}${sourceGroup}`
      : `<p>没有找到“${escapeHtml(keyword)}”，可以尝试“临淄”“守印”或“仓府”。</p>`;
  }
  $("#searchForm")?.addEventListener("submit", (e) => { e.preventDefault(); search(); });
  // 藏品和图录共用一个结果监听；根据 data 属性分流，避免重复绑定事件。
  searchResults?.addEventListener("click", async (event) => {
    const resultButton = event.target.closest("[data-search-id], [data-search-site-id]");
    if (!resultButton) return;

    if (resultButton.dataset.searchId) {
      const relic = await ApiService.getRelicById(resultButton.dataset.searchId);
      closeSearchDialog();
      window.setTimeout(() => {
        const target = $(`[data-relic-card="${resultButton.dataset.searchId}"]`);
        if (!target) return $("#collection")?.scrollIntoView();
        revealTarget(target);
        if (relic) showToast(`已定位：${relic.name} · ${relic.location}`);
      }, 80);
      return;
    }

    const site = getKnowledge()?.sites?.find((item) => item.id === Number(resultButton.dataset.searchSiteId));
    if (!site) return;
    closeSearchDialog();

    // 搜索结果直接打开完整图录弹窗，并定位对应卡片。
    renderSourceDialogIndex(site.city);
    sourceDialog.classList.remove("is-closing");
    sourceDialog.showModal();
    openModalAnimation(sourceDialogPanel);
    window.setTimeout(() => {
      const targetCard = $(`#sourceDialogIndex [data-source-card="${site.id}"]`);
      targetCard?.classList.add("search-target");
      targetCard?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
      showToast(`已定位图录：${site.city} · ${site.seals[0]}`);
    }, 80);
  });

  // ==================== 07. AI 聊天、图片预览和会话保存 ====================
  function appendMessage(text, role) {
    const messages = $("#chatMessages");
    const message = document.createElement("div");
    message.className = `chat-message ${role}`;
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
  }
  function clearSelectedImages() {
    selectedImages.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    selectedImages = [];
    $("#aiImage").value = "";
    renderSelectedImages();
  }
  function renderSelectedImages() {
    const preview = $("#uploadPreview");
    preview.hidden = selectedImages.length === 0;
    $("#uploadCount").textContent = `已选择 ${selectedImages.length} 张图片`;
    $("#uploadThumbnails").innerHTML = selectedImages.map((item, index) => `<div class="upload-item"><img src="${item.previewUrl}" alt="待上传图片 ${index + 1}"><button type="button" data-remove-image="${item.id}" aria-label="移除${escapeHtml(item.file.name)}">×</button><span title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</span></div>`).join("");
  }
  // 发送期间禁用按钮；成功后保存 sessionId，让百炼能够接着上一次对话回答。
  async function sendAiMessage(message) {
    const images = selectedImages.map((item) => item.file);
    if (!message && !images.length) return;
    const uploadText = images.length ? `已附带 ${images.length} 张图片` : "";
    appendMessage([message, uploadText].filter(Boolean).join(" · "), "user");
    $("#aiQuestion").value = "";
    clearSelectedImages();
    const pending = appendMessage("思考中……", "assistant pending");
    const submitButton = $("#chatForm button[type='submit']"); submitButton.disabled = true;
    try {
      const result = await AiService.chat({ message, images, sessionId: aiSessionId });
      pending.innerHTML = renderMarkdown(result.reply);
      pending.classList.remove("pending");
      if (result.sessionId) {
        aiSessionId = result.sessionId;
        window.sessionStorage.setItem("nimeng-ai-session", aiSessionId);
      }
    } catch (error) {
      pending.textContent = error.message;
      pending.classList.remove("pending");
    } finally {
      submitButton.disabled = false;
    }
  }
  function renderAiStatus(status) {
    const statusElement = $("#aiStatus");
    if (!statusElement) return;
    statusElement.classList.toggle("disconnected", !status.connected);
    statusElement.innerHTML = `<i></i> ${status.connected ? "AI助手已连接" : "AI服务未连接"}`;
  }
  window.addEventListener("ai-status-change", (event) => renderAiStatus(event.detail || { connected: false }));
  $("#chatForm").addEventListener("submit", (event) => { event.preventDefault(); sendAiMessage($("#aiQuestion").value.trim()); });
  $$("[data-prompt]").forEach((button) => button.addEventListener("click", () => sendAiMessage(button.dataset.prompt)));
  $("#aiImage").addEventListener("change", () => {
    const files = [...$("#aiImage").files];
    const availableSlots = Math.max(0, 4 - selectedImages.length);
    const validFiles = files.filter((file) => {
      if (file.size > 5 * 1024 * 1024) { showToast(`${file.name} 超过 5MB，未加入上传队列`); return false; }
      return true;
    }).slice(0, availableSlots);
    if (files.length > availableSlots) showToast("一次最多选择 4 张图片");
    validFiles.forEach((file) => selectedImages.push({ id: `${Date.now()}-${Math.random()}`, file, previewUrl: URL.createObjectURL(file) }));
    $("#aiImage").value = "";
    renderSelectedImages();
  });
  $("#uploadThumbnails").addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-image]");
    if (!button) return;
    const index = selectedImages.findIndex((item) => item.id === button.dataset.removeImage);
    if (index < 0) return;
    URL.revokeObjectURL(selectedImages[index].previewUrl);
    selectedImages.splice(index, 1);
    renderSelectedImages();
  });
  $("#clearImages").addEventListener("click", clearSelectedImages);
  $("#clearChat").addEventListener("click", () => { $("#chatMessages").innerHTML = '<div class="chat-message assistant">对话已清空。还想了解哪一枚封泥？</div>'; aiSessionId = ""; window.sessionStorage.removeItem("nimeng-ai-session"); clearSelectedImages(); });

  // ==================== 08. 通用点击提示和藏品详情 ====================
  document.addEventListener("click", async (event) => {
    const notice = event.target.closest("[data-notice]"); if (notice) showToast(notice.dataset.notice);
    const detail = event.target.closest("[data-relic-id]"); if (detail) { const relic = await ApiService.getRelicById(detail.dataset.relicId); if (relic) showToast(`${relic.name}：${relic.inscription}，${relic.location}`); }
  });

  // ==================== 09. 滚动观察：导航高亮和板块渐显 ====================
  const navLinks = $$("#mainNav a");
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) navLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`)); }), { rootMargin: "-35% 0px -55%" });
  $$('main section[id]').forEach((section) => observer.observe(section));
  // 栏目进入时播放出现动画，完全离开后按离开方向消失；再次进入会重新播放。
  const revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
    const section = entry.target;
    if (entry.isIntersecting) {
      section.classList.remove("is-exiting-up", "is-exiting-down");
      section.classList.add("is-visible");
      return;
    }
    section.classList.remove("is-visible");
    // Observer 在元素刚越过边界时触发，此时元素可能尚未完全出屏；用中心位置判断方向更稳定。
    const exitsAbove = entry.boundingClientRect.top + entry.boundingClientRect.height / 2 < window.innerHeight / 2;
    section.classList.toggle("is-exiting-up", exitsAbove);
    section.classList.toggle("is-exiting-down", !exitsAbove);
  }), { rootMargin: "-8% 0px -8%", threshold: 0.01 });
  $$('[data-reveal]').forEach((section) => revealObserver.observe(section));

  /* 1. Global Reading Progress Cord & Parallax */
  const pageProgressBar = $("#pageProgressBar");
  let scrollTicking = false;
  window.addEventListener("scroll", () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        if (pageProgressBar) {
          pageProgressBar.style.width = `${Math.min(100, Math.max(0, scrollPercent))}%`;
        }

        if (!prefersReducedMotion()) {
          const shift = Math.min(scrollTop, window.innerHeight) / window.innerHeight;
          $$('[data-parallax]').forEach((item) => { item.style.setProperty("--parallax-y", `${shift * Number(item.dataset.parallax || 0) * (userSettings.motionIntensity / motionSettingRanges.pageMotion.max)}px`); });
        }
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });

  // 搜索定位统一使用该函数：滚动、描边、焦点和动画清理只维护一份。
  function revealTarget(target) {
    if (!target) return;
    const reduceMotion = prefersReducedMotion();
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    target.classList.remove("search-target");
    window.requestAnimationFrame(() => target.classList.add("search-target"));
    window.setTimeout(() => target.focus({ preventScroll: true }), reduceMotion ? 0 : visualEffects.searchFocusDelay);
    window.setTimeout(() => target.classList.remove("search-target"), visualEffects.searchHighlightLifetime);
  }

  /* 2. Interactive Tactile Stamp Ripple on Clickable Buttons */
  document.addEventListener("click", (event) => {
    const target = event.target.closest(".button, .filter-chip, .search-row button, .chat-form button, .scroll-story-controls button, .quick-prompts button");
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "stamp-ripple";
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    target.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), visualEffects.rippleLifetime);
  });

  /* 3. 3D 卡片倾斜：计算和复位方式与 Web-backup 中的原函数保持一致。 */
  if (window.matchMedia("(pointer: fine)").matches) {
    const cardSelector = [
      ".relic-card", ".story-card", ".creative-card", ".research-grid article",
      ".knowledge-values dl div", ".value-grid article", ".story-details article",
      ".course-list button", ".source-findings article", ".source-index article"
    ].join(", ");

    document.addEventListener("mousemove", (event) => {
      const card = event.target.closest(cardSelector);
      if (!card) return;
      if (userSettings.tiltDegrees === 0) { card.style.transform = ""; return; }
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -visualEffects.cardTiltDegrees;
      const rotateY = ((x - centerX) / centerX) * visualEffects.cardTiltDegrees;
      card.style.transform = `perspective(${visualEffects.cardPerspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-${visualEffects.cardLift}px)`;
    });

    document.addEventListener("mouseout", (event) => {
      const card = event.target.closest(cardSelector);
      if (card && (!event.relatedTarget || !card.contains(event.relatedTarget))) {
        card.style.transform = "";
      }
    });
  }

  /* 4. Ambient Floating Dust Canvas (Golden Ink & Clay Particles) */
  (function initAmbientDust() {
    const canvas = $("#ambientCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener("resize", () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particleCount = visualEffects.dustMaxParticles;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * visualEffects.dustSizeRange + visualEffects.dustSizeMin,
      speedX: (Math.random() - 0.5) * visualEffects.dustHorizontalSpeed,
      speedY: Math.random() * visualEffects.dustVerticalSpeedRange + visualEffects.dustVerticalSpeedMin,
      opacity: Math.random() * visualEffects.dustOpacityRange + visualEffects.dustOpacityMin,
      color: Math.random() < visualEffects.dustPrimaryRatio ? visualEffects.dustPrimaryColor : visualEffects.dustAccentColor
    }));

    function animate() {
      ctx.clearRect(0, 0, width, height);
      const activeCount = Math.min(particles.length, userSettings.dustQuantity);
      particles.slice(0, activeCount).forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.y > height) { p.y = -5; p.x = Math.random() * width; }
        if (p.x > width) p.x = 0;
        if (p.x < 0) p.x = width;

        ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }());

  init().catch(() => showToast("页面数据加载失败，请刷新后重试"));
}());
