import { create } from 'zustand';
import mmkvStorage from './storage';

export type LexiconEntry = {
    k: string;
    l: string;
    t: Record<string, string>;
    s: number;
};

type LexiconState = {
    version: number;
    lastSync: number;
    entries: Map<string, LexiconEntry>;
    loadFromStorage: () => void;
    syncWithServer: (data: LexiconEntry[], version: number) => void;
};

const STORAGE_KEY_DATA = 'lexicon_data_v1';
const STORAGE_KEY_META = 'lexicon_version_v1';
const SUPPORTED_PREFIXES = ['en', 'vi', 'zh', 'zh-CN'];

const normalize = (text: string): string => {
    if (!text) return "";
    return text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ');
};

export const useLexiconStore = create<LexiconState>((set) => ({
    version: 0,
    lastSync: 0,
    entries: new Map(),

    loadFromStorage: () => {
        const rawData = mmkvStorage.getString(STORAGE_KEY_DATA);
        const meta = mmkvStorage.getItem(STORAGE_KEY_META) || 0;

        if (rawData) {
            try {
                const parsed: LexiconEntry[] = JSON.parse(rawData);
                const map = new Map<string, LexiconEntry>();
                parsed.forEach(e => {
                    const key = `${e.l}:${normalize(e.k)}`;
                    map.set(key, e);
                });
                set({ entries: map, version: Number(meta) });
            } catch (e) {
            }
        }
    },

    syncWithServer: (data: LexiconEntry[], version: number) => {
        const map = new Map<string, LexiconEntry>();
        data.forEach(e => {
            const key = `${e.l}:${normalize(e.k)}`;
            map.set(key, e);
        });

        mmkvStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
        mmkvStorage.setItem(STORAGE_KEY_META, version);
        set({ entries: map, version });
    }
}));

export const normalizeLexiconText = normalize;

const lookupInStore = (
    normText: string,
    targetLang: string,
    store: Map<string, LexiconEntry>,
    master: Map<string, Record<string, string>>
): string | null => {
    if (master.has(normText)) {
        const entry = master.get(normText);
        if (entry && entry[targetLang]) {
            return entry[targetLang];
        }
    }

    for (const prefix of SUPPORTED_PREFIXES) {
        const key = `${prefix}:${normText}`;
        if (store.has(key)) {
            const entry = store.get(key);
            if (entry && entry.t && entry.t[targetLang]) {
                return entry.t[targetLang];
            }
        }
    }

    return null;
};

export const findBestTranslation = (
    text: string,
    lexiconMaster: Map<string, Record<string, string>>,
    targetLang: string
): { translatedText: string, ratio: number } => {
    const store = useLexiconStore.getState().entries;

    if (!text || !targetLang) return { translatedText: "", ratio: 0 };

    const normalizedFull = normalize(text);
    const fullMatch = lookupInStore(normalizedFull, targetLang, store, lexiconMaster);
    if (fullMatch) {
        return { translatedText: fullMatch, ratio: 1.0 };
    }

    const words = text.trim().split(/\s+/);
    const n = words.length;
    if (n === 0) return { translatedText: "", ratio: 0 };

    const translatedChunks: string[] = [];
    let i = 0;
    let matchedWordsCount = 0;

    while (i < n) {
        let matched = false;
        const maxWindow = Math.min(n - i, 6);

        for (let j = maxWindow; j > 0; j--) {
            const phrase = words.slice(i, i + j).join(' ');
            const normPhrase = normalize(phrase);

            const translation = lookupInStore(normPhrase, targetLang, store, lexiconMaster);

            if (translation) {
                translatedChunks.push(translation);
                matchedWordsCount += j;
                i += j;
                matched = true;
                break;
            }
        }

        if (!matched) {
            translatedChunks.push(words[i]);
            i++;
        }
    }

    return {
        translatedText: translatedChunks.join(' '),
        ratio: matchedWordsCount / n
    };
};