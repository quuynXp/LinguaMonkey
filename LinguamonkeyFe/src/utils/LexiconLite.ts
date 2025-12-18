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

export const findBestTranslation = (
    text: string,
    lexiconMaster: Map<string, Record<string, string>>,
    targetLang: string
): { translatedText: string, ratio: number } => {
    const store = useLexiconStore.getState();

    if (!text || !targetLang) return { translatedText: "", ratio: 0 };

    const normalizedInput = normalize(text);

    for (const [key, entry] of store.entries) {
        if (key.endsWith(`:${normalizedInput}`)) {
            if (entry.t && entry.t[targetLang]) {
                return { translatedText: entry.t[targetLang], ratio: 1.0 };
            }
        }
    }

    if (lexiconMaster && lexiconMaster.size > 0) {
        const entry = lexiconMaster.get(normalizedInput);
        if (entry && entry[targetLang]) {
            return { translatedText: entry[targetLang], ratio: 1.0 };
        }
    }

    return { translatedText: "", ratio: 0 };
};