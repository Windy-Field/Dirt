interface ApiSite {
    id: number;
    period: string;
    [key: string]: any;
}
interface ApiRelic {
    id: string;
    name: string;
    inscription: string;
    period: string;
    location: string;
    category: string;
    value: string;
    [key: string]: any;
}
interface ApiCourse extends Course {
    id: string;
    videoUrl?: string;
    posterUrl?: string;
    resourceUrl?: string;
    resourceType?: string;
    resourceName?: string;
    resourceFileName?: string;
    slideBasePath?: string;
    slideCount?: number;
    [key: string]: any;
}
(function initializeDataService() {
    let valueResult1;
    const value1 = window.APP_CONFIG;
    if (value1 === null || value1 === undefined) {
        valueResult1 = undefined;
    }
    else {
        valueResult1 = value1.API_BASE_URL;
    }
    const baseUrl = String(valueResult1 || "").replace(/\/$/, "");
    let valueResult3;
    const value3 = window.APP_CONFIG;
    if (value3 === null || value3 === undefined) {
        valueResult3 = undefined;
    }
    else {
        valueResult3 = value3.USE_DATABASE;
    }
    const useDatabase = Boolean(valueResult3);
    let valueResult5;
    const value5 = window.APP_CONFIG;
    if (value5 === null || value5 === undefined) {
        valueResult5 = undefined;
    }
    else {
        valueResult5 = value5.USE_QUIZ_DATABASE;
    }
    const useQuizDatabase = Boolean(valueResult5);
    const apiUrl = function apiUrl(path) {
        return ("" + (baseUrl) + (path));
    };
    // GET 请求统一从这里读取 JSON；接口报错时把错误交给页面处理
    async function request(path: string): Promise<any> {
        const response = await fetch(apiUrl(path));
        if (!response.ok) {
            throw new Error((await response.json().catch(function () {
                return ({});
            })).error || ("数据请求失败（" + (response.status) + "）"));
        }
        return response.json();
    }
    // 将提交内容转换为 JSON，并统一检查服务器是否成功接收
    async function post(path: string, body: any): Promise<any> {
        const response = await fetch(apiUrl(path), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new Error((await response.json().catch(function () {
                return ({});
            })).error || ("数据提交失败（" + (response.status) + "）"));
        }
        return response.json();
    }
    // 根据 USE_DATABASE 选择本地数据或数据库接口
    const copyItems = function copyItems(items: any[]): any[] {
        let valueResult7;
        const items7 = items;
        const result10 = [];
        for (let index9 = 0; index9 < items7.length; index9++) {
            let valueResult9;
            {
                const item = items7[index9];
                valueResult9 = (Object.assign({}, item));
            }
            result10.push(valueResult9);
        }
        valueResult7 = result10;
        return valueResult7;
    };
    // 常用媒体配置按课程 id 补充视频、课件等公开资源，数据库和 mock 模式共用
    const applyCourseMedia = function applyCourseMedia(items: Course[]): Course[] {
        let valueResult11;
        const items12 = items;
        const result15 = [];
        for (let index14 = 0; index14 < items12.length; index14++) {
            let valueResult13;
            {
                const course = items12[index14];
                let valueResult15;
                {
                    const value16 = window.MEDIA_CONFIG;
                    if (value16 === null || value16 === undefined) {
                        valueResult15 = undefined;
                    }
                    else {
                        const value17 = value16.courses;
                        if (value17 === null || value17 === undefined) {
                            valueResult15 = undefined;
                        }
                        else {
                            valueResult15 = value17[course.id];
                        }
                    }
                    const media: any = valueResult15 || {};
                    valueResult13 = Object.assign({}, course, { videoUrl: media.videoUrl || course.videoUrl || "",
                        posterUrl: media.posterUrl || course.posterUrl || "",
                        resourceUrl: media.resourceUrl || course.resourceUrl || "",
                        resourceType: media.resourceType || course.resourceType || "",
                        resourceName: media.resourceName || course.resourceName || "",
                        resourceFileName: media.resourceFileName || course.resourceFileName || "",
                        slideBasePath: media.slideBasePath || course.slideBasePath || "",
                        slideCount: Number(media.slideCount || course.slideCount) || 0 });
                }
            }
            result15.push(valueResult13);
        }
        valueResult11 = result15;
        return valueResult11;
    };
    // 先复制数组，再从后往前随机交换，避免打乱原始题库
    function shuffle(items: any[]): any[] {
        let valueResult17;
        const items20 = [];
        const part21 = Array.from(items);
        for (let index22 = 0; index22 < part21.length; index22++) {
            items20.push(part21[index22]);
        }
        valueResult17 = items20;
        const result = valueResult17;
        for (let index = result.length - 1; index > 0; index -= 1) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
        }
        return result;
    }
    // 将本地题目整理成与云端接口一致的结构
    function startMockQuiz() {
        const questions = shuffle(copyItems(window.MOCK_DATA.questions)).slice(0, 10);
        if (questions.length < 10) {
            throw new Error("题库至少需要 10 道题目");
        }
        return { questions: questions, total: 10, scorePerQuestion: 10 };
    }
    function answerMockQuiz(questionId: number, answer: string): any {
        let valueResult19;
        {
            let searchFinished20 = false;
            const items24 = window.MOCK_DATA.questions;
            for (let index26 = 0; !searchFinished20 && index26 < items24.length; index26++) {
                let valueResult21;
                {
                    const item = items24[index26];
                    valueResult21 = item.id === Number(questionId);
                }
                if (valueResult21) {
                    valueResult19 = items24[index26];
                    searchFinished20 = true;
                }
            }
            if (!searchFinished20) {
                valueResult19 = undefined;
                searchFinished20 = true;
            }
        }
        const question = valueResult19;
        if (!question) {
            throw new Error("题目不存在");
        }
        const selectedAnswer = String(answer).toUpperCase();
        const correct = selectedAnswer === question.correctAnswer;
        let valueResult23;
        if (correct) {
            valueResult23 = 10;
        }
        else {
            valueResult23 = 0;
        }
        return {
            questionId: question.id,
            selectedAnswer: selectedAnswer,
            correct: correct,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            earnedScore: valueResult23,
        };
    }
    // 向页面提供统一的数据接口
    window.ApiService = {
        async getStats() {
            let valueResult25;
            if (useDatabase) {
                valueResult25 = request("/api/data/stats");
            }
            else {
                valueResult25 = Object.assign({}, window.MOCK_DATA.stats);
            }
            return valueResult25;
        },
        async getMapConfig() {
            return { imageUrl: window.MOCK_DATA.mapImageUrl };
        },
        async getSites(period?) {
            if (period === undefined) {
                period = "全部";
            }
            if (useDatabase) {
                return request(("/api/data/sites?period=" + (encodeURIComponent(period))));
            }
            const mainSystems = ["青州", "兖州", "徐州"];
            let valueResult27;
            const items31 = window.MOCK_DATA.sites;
            const result34 = [];
            for (let index33 = 0; index33 < items31.length; index33++) {
                let valueResult29;
                {
                    const site = items31[index33];
                    if (period === "全部") {
                        valueResult29 = true;
                    }
                    else {
                        if (period === "其他") {
                            let valueResult31;
                            {
                                let searchFinished32 = false;
                                const items35 = mainSystems;
                                for (let index37 = 0; !searchFinished32 && index37 < items35.length; index37++) {
                                    let valueResult33;
                                    {
                                        const name = items35[index37];
                                        valueResult33 = site.period.includes(name);
                                    }
                                    if (valueResult33) {
                                        valueResult31 = true;
                                        searchFinished32 = true;
                                    }
                                }
                                if (!searchFinished32) {
                                    valueResult31 = false;
                                    searchFinished32 = true;
                                }
                                valueResult29 = !valueResult31;
                            }
                        }
                        else {
                            valueResult29 = site.period.includes(period);
                        }
                    }
                }
                if (valueResult29) {
                    result34.push(items31[index33]);
                }
            }
            valueResult27 = result34;
            const items = valueResult27;
            return copyItems(items);
        },
        async getRelics(params?: {
            keyword?: string;
        }) {
            if (params === undefined) {
                params = {};
            }
            if (useDatabase) {
                return request(("/api/data/relics?keyword=" + (encodeURIComponent(params.keyword || ""))));
            }
            const keyword = String(params.keyword || "")
                .trim()
                .toLowerCase();
            let valueResult35;
            const items41 = window.MOCK_DATA.relics;
            const result44 = [];
            for (let index43 = 0; index43 < items41.length; index43++) {
                let valueResult37;
                {
                    const item = items41[index43];
                    {
                        let conditionValue43 = !keyword;
                        if (!conditionValue43) {
                            let valueResult39;
                            {
                                let searchFinished40 = false;
                                const items45 = [item.name, item.inscription, item.period, item.location, item.category, item.value];
                                for (let index47 = 0; !searchFinished40 && index47 < items45.length; index47++) {
                                    let valueResult41;
                                    {
                                        const field = items45[index47];
                                        valueResult41 = field.toLowerCase().includes(keyword);
                                    }
                                    if (valueResult41) {
                                        valueResult39 = true;
                                        searchFinished40 = true;
                                    }
                                }
                                if (!searchFinished40) {
                                    valueResult39 = false;
                                    searchFinished40 = true;
                                }
                            }
                            conditionValue43 = valueResult39;
                        }
                        valueResult37 = conditionValue43;
                    }
                }
                if (valueResult37) {
                    result44.push(items41[index43]);
                }
            }
            valueResult35 = result44;
            const items = valueResult35;
            return { items: copyItems(items), total: items.length };
        },
        async getRelicById(id) {
            let valueResult44;
            if (useDatabase) {
                valueResult44 = request(("/api/data/relics/" + (encodeURIComponent(id))));
            }
            else {
                let valueResult46;
                {
                    let searchFinished47 = false;
                    const items52 = window.MOCK_DATA.relics;
                    for (let index54 = 0; !searchFinished47 && index54 < items52.length; index54++) {
                        let valueResult48;
                        {
                            const item = items52[index54];
                            valueResult48 = item.id === id;
                        }
                        if (valueResult48) {
                            valueResult46 = items52[index54];
                            searchFinished47 = true;
                        }
                    }
                    if (!searchFinished47) {
                        valueResult46 = undefined;
                        searchFinished47 = true;
                    }
                    valueResult44 = valueResult46 || null;
                }
            }
            return valueResult44;
        },
        async getCourses() {
            let valueResult50;
            if (useDatabase) {
                valueResult50 = await request("/api/data/courses");
            }
            else {
                valueResult50 = copyItems(window.MOCK_DATA.courses);
            }
            const items = valueResult50;
            return applyCourseMedia(items);
        },
        async startQuiz() {
            let valueResult52;
            if (useQuizDatabase) {
                valueResult52 = request("/api/quiz/start");
            }
            else {
                valueResult52 = startMockQuiz();
            }
            return valueResult52;
        },
        async answerQuiz(questionId, answer) {
            let valueResult54;
            if (useQuizDatabase) {
                valueResult54 = post("/api/quiz/answer", { questionId: questionId, answer: answer });
            }
            else {
                valueResult54 = answerMockQuiz(questionId, answer);
            }
            return valueResult54;
        },
    };
})();
