import { createMMKV } from 'react-native-mmkv';

const STORAGE_ID = 'lingua-monkey-storage';
const ENCRYPTION_KEY = 'lingua-monkey-secure-key';
const MAX_RETRY_ATTEMPTS = 3;

const logger = {
    warn: (message: string, error?: any) => {
        if (__DEV__) {
            console.warn(`[MMKV Storage] ${message}`, error);
        }
    },
    error: (message: string, error?: any) => {
        if (__DEV__) {
            console.error(`[MMKV Storage] ${message}`, error);
        }
    },
    info: (message: string) => {
        if (__DEV__) {
            console.log(`[MMKV Storage] ${message}`);
        }
    },
};

let storage = null;

const initializeStorage = () => {
    try {
        storage = createMMKV({
            id: STORAGE_ID,
            encryptionKey: ENCRYPTION_KEY,
        });

        logger.info('MMKV Storage initialized successfully');
        return true;
    } catch (error) {
        logger.error('Failed to initialize MMKV storage', error);
        return false;
    }
};

export const clearChatCache = () => {
    try {
        const storageInstance = ensureStorageInitialized();
        const allKeys = storageInstance.getAllKeys();

        allKeys.forEach((key) => {
            if (key.startsWith('room_msgs_') || key.startsWith('trans_')) {
                storageInstance.delete(key);
            }
        });

        logger.info('Chat cache cleared successfully');
        return true;
    } catch (error) {
        logger.error('Failed to clear chat cache', error);
        return false;
    }
};

const isInitialized = initializeStorage();

const ensureStorageInitialized = () => {
    if (!storage || !isInitialized) {
        if (initializeStorage() && storage) {
            return storage;
        }
        throw new Error('MMKV storage is not initialized');
    }
    return storage;
};

const retryOperation = async (operation: () => any, maxRetries = MAX_RETRY_ATTEMPTS) => {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt === maxRetries) throw lastError;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 100));
        }
    }
};

const validateKey = (key: string) => {
    if (!key || typeof key !== 'string' || key.trim() === '') {
        throw new Error('Key must be a non-empty string');
    }
    return key.trim();
};

const detectDataType = (value: any) => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'object') return 'object';
    return 'unknown';
};

export const setItem = (key: string, value: any, options = { retry: true }) => {
    try {
        const validatedKey = validateKey(key);
        const storageInstance = ensureStorageInitialized();
        const dataType = detectDataType(value);

        const operation = () => {
            switch (dataType) {
                case 'null':
                    storageInstance.set(validatedKey, '__MMKV_NULL__');
                    break;
                case 'boolean':
                    storageInstance.set(validatedKey, value as boolean);
                    break;
                case 'number':
                    storageInstance.set(validatedKey, value as number);
                    break;
                case 'string':
                    storageInstance.set(validatedKey, value as string);
                    break;
                case 'object':
                    try {
                        const serialized = JSON.stringify(value);
                        storageInstance.set(validatedKey, `__MMKV_OBJECT__${serialized}`);
                    } catch (e: any) {
                        throw new Error(`Failed to serialize object: ${e.message}`);
                    }
                    break;
                default:
                    throw new Error(`Unsupported data type: ${dataType}`);
            }
        };

        if (options.retry) {
            try {
                operation();
            } catch (e) {
                operation();
            }
        } else {
            operation();
        }

        return true;
    } catch (error) {
        logger.error(`Failed to set item with key "${key}"`, error);
        return false;
    }
};

export const getItem = (key: string, defaultValue: any = null) => {
    try {
        const validatedKey = validateKey(key);
        const storageInstance = ensureStorageInitialized();

        if (!storageInstance.contains(validatedKey)) {
            return defaultValue;
        }

        const stringValue = storageInstance.getString(validatedKey);

        if (stringValue === '__MMKV_NULL__') {
            return null;
        }

        if (stringValue && stringValue.startsWith('__MMKV_OBJECT__')) {
            try {
                const json = stringValue.replace('__MMKV_OBJECT__', '');
                return JSON.parse(json);
            } catch (e) {
                logger.warn(`Failed to parse object for key ${key}`);
                return defaultValue;
            }
        }

        if (stringValue !== undefined) return stringValue;

        const boolVal = storageInstance.getBoolean(validatedKey);
        const numVal = storageInstance.getNumber(validatedKey);

        return boolVal || numVal || stringValue || defaultValue;

    } catch (error) {
        logger.error(`Failed to get item with key "${key}"`, error);
        return defaultValue;
    }
};

export const removeItem = (key: string) => {
    try {
        const validatedKey = validateKey(key);
        const storageInstance = ensureStorageInitialized();
        if (storageInstance.contains(validatedKey)) {
            storageInstance.delete(validatedKey);
            return true;
        }
        return false;
    } catch (error) {
        logger.error(`Failed to remove item "${key}"`, error);
        return false;
    }
};

export const clearAll = () => {
    try {
        const storageInstance = ensureStorageInitialized();
        storageInstance.clearAll();
        return true;
    } catch (error) {
        logger.error('Failed to clear all', error);
        return false;
    }
};

const mmkvStorage = {
    setItem,
    getItem,
    removeItem,
    setString: (key: string, value: string) => setItem(key, value),
    getString: (key: string) => {
        const val = getItem(key);
        return typeof val === 'string' ? val : null;
    },
    delete: removeItem,
    clearAll,
    clearChatCache,
    contains: (key: string) => {
        try {
            return ensureStorageInitialized().contains(key);
        } catch { return false; }
    },
    getAllKeys: () => {
        try {
            return ensureStorageInitialized().getAllKeys();
        } catch { return []; }
    }
};

export default mmkvStorage;