(function () {
  // 模拟网络延迟，让当前本地假数据的使用方式接近真正的异步后端接口。
  const delay = (value, ms = 120) => new Promise((resolve) => setTimeout(() => resolve(value), ms));
  const copyItems = (items) => items.map((item) => ({ ...item }));

  // 页面只通过此服务读取业务数据，不直接操作 MOCK_DATA。
  // 以后接入数据库时，保留这些方法名，把方法内部替换为 fetch 请求即可。
  window.ApiService = {
    async getStats() { return delay({ ...window.MOCK_DATA.stats }); },
    async getMapConfig() { return delay({ imageUrl: window.MOCK_DATA.mapImageUrl }); },
    async getSites(period = "全部") {
      const mainSystems = ["青州", "兖州", "徐州"];
      const items = period === "全部" ? window.MOCK_DATA.sites : window.MOCK_DATA.sites.filter((site) => period === "其他" ? !mainSystems.some((name) => site.period.includes(name)) : site.period.includes(period));
      return delay(copyItems(items));
    },
    async getRelics(params = {}) {
      const keyword = String(params.keyword || "").trim().toLowerCase();
      const items = window.MOCK_DATA.relics.filter((item) => !keyword || [item.name, item.inscription, item.period, item.location, item.category, item.value].some((field) => field.toLowerCase().includes(keyword)));
      return delay({ items: copyItems(items), total: items.length });
    },
    async getRelicById(id) { return delay(window.MOCK_DATA.relics.find((item) => item.id === id) || null); },
    async getCourses() { return delay(copyItems(window.MOCK_DATA.courses)); },
    async getCreativeWorks() { return delay(copyItems(window.MOCK_DATA.creativeWorks)); }
  };
}());
