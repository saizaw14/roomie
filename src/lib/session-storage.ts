import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createChunkedStorage, type AsyncStorageAdapter } from './chunked-storage';

const nativeStorage = createChunkedStorage({
  getItem: key => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: key => SecureStore.deleteItemAsync(key),
});
export const sessionStorage: AsyncStorageAdapter = Platform.OS === 'web' ? {
  // Static exports have no browser storage. Errors in a real browser propagate to auth UI.
  getItem: async key => typeof window === 'undefined' ? null : window.localStorage.getItem(key),
  setItem: async (key, value) => { if (typeof window !== 'undefined') window.localStorage.setItem(key, value); },
  removeItem: async key => { if (typeof window !== 'undefined') window.localStorage.removeItem(key); },
} : nativeStorage;
