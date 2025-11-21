import i18n from '../i18n';

export const getGreetingKey = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'greeting.morning';
    if (hour < 18) return 'greeting.afternoon';
    return 'greeting.evening';
};

export interface Quote {
    id: string;
    text: string;
    author?: string;
}

const QUOTES: Record<string, Quote[]> = {
    en: [
        { id: '1', text: "Every word you learn is a step closer to fluency! 🌟" },
        { id: '2', text: "Consistency is the key to mastering any language! 💪" },
        { id: '3', text: "Mistakes are proof that you are trying. Keep going!" },
        { id: '4', text: "A different language is a different vision of life." },
        { id: '5', text: "Learning a language is having one more window from which to look at the world." },
    ],
    vi: [
        { id: '1', text: "Mỗi từ bạn học là một bước tiến gần hơn đến sự thành thạo! 🌟" },
        { id: '2', text: "Sự kiên trì là chìa khóa để làm chủ bất kỳ ngôn ngữ nào! 💪" },
        { id: '3', text: "Sai lầm là bằng chứng cho thấy bạn đang cố gắng. Tiếp tục nào!" },
        { id: '4', text: "Biết thêm một ngôn ngữ là sống thêm một cuộc đời." },
        { id: '5', text: "Học ngôn ngữ là mở thêm một cửa sổ để nhìn ra thế giới." },
    ],
    zh: [
        { id: '1', text: "你学的每个词都让你更接近流利！🌟" },
        { id: '2', text: "坚持不懈是掌握任何语言的关键！💪" },
        { id: '3', text: "错误证明你在努力。继续加油！" },
        { id: '4', text: "另一种语言是生活的另一种愿景。" },
        { id: '5', text: "学习一门语言就是多开一扇看世界的窗户。" },
    ]
};

export const getRandomQuote = (languageCode: string = 'en'): Quote => {
    const lang = Object.keys(QUOTES).includes(languageCode) ? languageCode : 'en';
    const quotesList = QUOTES[lang];
    const randomIndex = Math.floor(Math.random() * quotesList.length);
    return quotesList[randomIndex];
};

export const getTimeBasedEmoji = (): string => {
    const hour = new Date().getHours();
    if (hour < 6) return '🌙';
    if (hour < 12) return '🌅';
    if (hour < 18) return '☀️';
    return '🌇';
};