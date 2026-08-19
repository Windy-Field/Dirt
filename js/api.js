(function () {
  const baseUrl = String(window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  const useDatabase = Boolean(window.APP_CONFIG?.USE_DATABASE);
  const useQuizDatabase = Boolean(window.APP_CONFIG?.USE_QUIZ_DATABASE);
  const apiUrl = (path) => `${baseUrl}${path}`;
  async function request(path) {
    const response = await fetch(apiUrl(path));
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `数据请求失败（${response.status}）`);
    return response.json();
  }
  async function post(path, body) {
    const response = await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `数据提交失败（${response.status}）`);
    return response.json();
  }

  // 未配置数据库时保留模拟数据，便于本地做页面开发；上线时打开 USE_DATABASE。
  const delay = (value, ms = 120) => new Promise((resolve) => setTimeout(() => resolve(value), ms));
  const copyItems = (items) => items.map((item) => ({ ...item }));
  function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
    }
    return result;
  }

  // 模拟模式与云端接口返回相同结构，切换数据库时页面逻辑无需改变。
  function startMockQuiz() {
    const questions = shuffle(copyItems(window.MOCK_DATA.questions)).slice(0, 10);
    if (questions.length < 10) throw new Error("题库至少需要 10 道题目");
    return delay({ questions, total: 10, scorePerQuestion: 10 });
  }

  function answerMockQuiz(questionId, answer) {
    const question = window.MOCK_DATA.questions.find((item) => item.id === Number(questionId));
    if (!question) throw new Error("题目不存在");
    const selectedAnswer = String(answer).toUpperCase();
    const correct = selectedAnswer === question.correctAnswer;
    return delay({
      questionId: question.id,
      selectedAnswer,
      correct,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      earnedScore: correct ? 10 : 0
    });
  }

  // 页面只调用 ApiService；这里统一处理“本地 mock / 云端数据库”的差异。
  window.ApiService = {
    async getStats() { return useDatabase ? request("/api/data/stats") : delay({ ...window.MOCK_DATA.stats }); },
    async getMapConfig() { return delay({ imageUrl: window.MOCK_DATA.mapImageUrl }); },
    async getSites(period = "全部") {
      if (useDatabase) return request(`/api/data/sites?period=${encodeURIComponent(period)}`);
      const mainSystems = ["青州", "兖州", "徐州"];
      const items = period === "全部" ? window.MOCK_DATA.sites : window.MOCK_DATA.sites.filter((site) => period === "其他" ? !mainSystems.some((name) => site.period.includes(name)) : site.period.includes(period));
      return delay(copyItems(items));
    },
    async getRelics(params = {}) {
      if (useDatabase) return request(`/api/data/relics?keyword=${encodeURIComponent(params.keyword || "")}`);
      const keyword = String(params.keyword || "").trim().toLowerCase();
      const items = window.MOCK_DATA.relics.filter((item) => !keyword || [item.name, item.inscription, item.period, item.location, item.category, item.value].some((field) => field.toLowerCase().includes(keyword)));
      return delay({ items: copyItems(items), total: items.length });
    },
    async getRelicById(id) { return useDatabase ? request(`/api/data/relics/${encodeURIComponent(id)}`) : delay(window.MOCK_DATA.relics.find((item) => item.id === id) || null); },
    async getCourses() { return useDatabase ? request("/api/data/courses") : delay(copyItems(window.MOCK_DATA.courses)); },
    async getCreativeWorks() { return useDatabase ? request("/api/data/creative-works") : delay(copyItems(window.MOCK_DATA.creativeWorks)); },
    async startQuiz() { return useQuizDatabase ? request("/api/quiz/start") : startMockQuiz(); },
    async answerQuiz(questionId, answer) { return useQuizDatabase ? post("/api/quiz/answer", { questionId, answer }) : answerMockQuiz(questionId, answer); }
  };
}());
