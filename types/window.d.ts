// Classic scripts share these interfaces through window, in index.html load order.
interface AppConfig {
    AI_API_BASE_URL?: string;
    AI_FALLBACK_API_BASE_URL?: string;
    API_BASE_URL?: string;
    USE_DATABASE?: boolean;
    USE_QUIZ_DATABASE?: boolean;
    UMAMI_WEBSITE_ID?: string;
    UMAMI_SCRIPT_URL?: string;
    UMAMI_DOMAINS?: string;
}
interface AiStatus {
    connected: boolean | null;
    configured?: boolean | null;
    verified?: boolean;
    checking?: boolean;
}
interface AiRequest {
    message: string;
    images?: File[];
    sessionId?: string;
}
interface AiReply {
    reply: string;
    sessionId?: string;
    error?: string;
    errorCode?: string;
    upstreamCode?: string;
    requestId?: string;
}
interface AiService {
    getStatus(): Promise<AiStatus>;
    chat(request: AiRequest): Promise<AiReply>;
}
interface ApiService {
    getStats(): Promise<SiteStats>;
    getMapConfig(): Promise<{
        imageUrl: string;
    }>;
    getSites(period?: string): Promise<Site[]>;
    getRelics(params?: {
        keyword?: string;
    }): Promise<{
        items: Relic[];
        total: number;
    }>;
    getRelicById(id: string): Promise<Relic | null>;
    getCourses(): Promise<Course[]>;
    startQuiz(): Promise<QuizRound>;
    answerQuiz(questionId: number, answer: string): Promise<QuizAnswer>;
}
interface Window {
    APP_CONFIG: AppConfig;
    MEDIA_CONFIG: MediaConfig;
    MediaSecurity: {
        resolve(value: unknown): string;
    };
    ApiService: ApiService;
    AiService: AiService;
    NiyunMapBrowser: typeof NiyunMapBrowser;
    NiyunSiteNavigation: typeof NiyunSiteNavigation;
    NiyunAiChat: typeof NiyunAiChat;
    NiyunCourseBrowser: typeof NiyunCourseBrowser;
    NiyunDisplaySettings: typeof NiyunDisplaySettings;
    NiyunOpeningLoader: typeof NiyunOpeningLoader;
    NiyunPageEffects: typeof NiyunPageEffects;
    NiyunScrollStory: typeof NiyunScrollStory;
    NiyunSearchDialog: typeof NiyunSearchDialog;
    NiyunSourceArchive: typeof NiyunSourceArchive;
    SEAL_3D_PRODUCTS: ProductData;
    AI_PET_CONFIG: PetConfig;
    MOCK_DATA: MockData;
    SEAL_KNOWLEDGE: KnowledgeData;
    PPT_KNOWLEDGE: KnowledgeData;
    SHANDONG_TERRAIN: TerrainConfig;
    SUPPLEMENTARY_SOURCES: SupplementaryData;
    NIYUN_THEME_SCHEDULE: {
        lightStartHour: number;
        lightEndHour: number;
    };
    THREE: typeof THREE;
    SHANDONG_TERRAIN_INLINE: {
        width: number;
        height: number;
        heightBase64: string;
        maskBase64: string;
    };
    SHANDONG_PREFECTURES: MapRegion[];
    SHANDONG_RIVERS: MapRiver[];
    SHANDONG_REFERENCE_RIVERS: MapRiver[];
    SHANDONG_LAKES: MapRegion[];
    SHANDONG_REFERENCE_LAKES: MapRegion[];
    SEAL_INLINE_TEXTURES: {
        [path: string]: string;
    };
    NiyunSealGlyphs: {
        render(target: Element): void;
    };
    MediaCoordinator: {
        playMusic(): Promise<boolean>;
        pauseMusic(): void;
        restartMusic(): Promise<boolean>;
        getAudio(): HTMLAudioElement;
        hasMusic(): boolean;
    };
    scheduler?: {
        postTask(callback: {
            (): void;
        }, options: {
            priority: string;
        }): Promise<void>;
    };
}
declare var ApiService: ApiService;
declare var AiService: AiService;
interface WindowEventMap {
    "ai-status-change": CustomEvent<AiStatus>;
    "shandong-map-mode-change": CustomEvent<{
        mode: string;
    }>;
}
