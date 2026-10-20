// 浏览器模块共用的数据类型
interface Site {
    id: number;
    city: string;
    name: string;
    period: string;
    tags: string[];
    count: number;
    x: number;
    y: number;
    seals: string[];
    admin: string;
    note: string;
    description?: string;
}
interface Relic {
    id: string;
    name: string;
    inscription: string;
    period: string;
    location: string;
    category: string;
    tone: string;
    value: string;
    imageUrl: string;
    summary: string;
}
interface CourseMedia {
    videoUrl?: string;
    posterUrl?: string;
    resourceUrl?: string;
    resourceType?: string;
    resourceName?: string;
    resourceFileName?: string;
    slideBasePath?: string;
    slideCount?: number;
}
interface Course extends CourseMedia {
    id: string;
    title: string;
    lesson: number;
    duration: string;
    description: string;
}
interface QuizQuestion {
    id: number;
    difficulty: string;
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation: string;
}
interface SiteStats {
    relics: number;
    sites: number;
    courses: number;
}
interface QuizRound {
    questions: QuizQuestion[];
    total: number;
    scorePerQuestion: number;
}
interface QuizAnswer {
    questionId: number;
    selectedAnswer: string;
    correct: boolean;
    correctAnswer: string;
    explanation: string;
    earnedScore: number;
}
interface MockData {
    stats: SiteStats;
    mapImageUrl: string;
    sites: Site[];
    relics: Relic[];
    courses: Course[];
    questions: QuizQuestion[];
}
interface KnowledgeData {
    source: string;
    summary: {
        locations: number;
        labels: number;
        coreFinding: string;
    };
    findings: {
        title: string;
        text: string;
    }[];
    sites: Site[];
}
interface SourceImage {
    src: string;
    alt: string;
    caption: string;
    kind: string;
}
interface SourceDebate {
    label: string;
    text: string;
}
interface SourceEntry {
    id: string;
    title: string;
    inscription: string;
    category: string;
    period: string;
    location: string;
    mapSiteId: number;
    lead: string;
    insight: string;
    archaeology: string[];
    transmittedSources: string[];
    references: string[];
    caution: string;
    images: SourceImage[];
    debate?: SourceDebate[];
}
interface SupplementaryData {
    updatedAt: string;
    sourceDocument: string;
    entries: SourceEntry[];
}
interface MusicTrack {
    id: string;
    label: string;
    volumeScale: number;
    url: string;
}
interface MusicConfig {
    title?: string;
    defaultTrackId?: string;
    defaultVolume?: number;
    defaultEnabled?: boolean;
    defaultCarouselEnabled?: boolean;
    tracks?: MusicTrack[];
}
interface CoursePack {
    guideUrl?: string;
    guideFileName?: string;
    recapVideoUrl?: string;
    recapPosterUrl?: string;
}
interface MediaConfig {
    backgroundMusic: MusicConfig;
    brandLogo: string;
    allowedExternalHosts: string[];
    courses: {
        [id: string]: CourseMedia;
    };
    coursePack: CoursePack;
    textures: {
        [name: string]: string;
    };
}
interface PetConfig {
    enabled?: boolean;
    allowDrag?: boolean;
    dynamicGreeting?: boolean;
    greetingTiming?: {
        visibleMs?: number;
        hiddenMs?: number;
        initialDelayMs?: number;
    };
    defaultState?: string;
    imageAlt?: string;
    states?: {
        [name: string]: string;
    };
}
interface ProductItem {
    id: string;
    code: string;
    suit?: string;
    title: string;
    subtitle: string;
    description: string;
    front: string;
    back: string;
}
interface ProductCollection {
    label: string;
    model: {
        width: number;
        height: number;
        depth: number;
        radius: number;
    };
    items: ProductItem[];
}
interface ProductData {
    poker: ProductCollection;
    mahjong: ProductCollection;
}
interface TerrainConfig {
    dataMode: string;
    heightDataUrl: string;
    maskDataUrl: string;
    bounds: {
        west: number;
        east: number;
        north: number;
        south: number;
    };
    attribution: string;
    terrain: {
        baseDepth: number;
        reliefScale: number;
        heightExaggeration: number;
    };
}
interface MapRegion {
    name: string;
    rings: number[][][];
    source?: string;
}
interface MapRiver {
    name: string;
    points: number[][];
    source?: string;
    width?: number;
}
