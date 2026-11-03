import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type TokenStore = {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
};

const KEY = 'english-coach.session-token';

/** Keychain/Keystore on native. SecureStore has no web implementation, so web uses localStorage. */
export const secureTokenStore: TokenStore =
  Platform.OS === 'web'
    ? {
        get: async () => {
          try {
            return window.localStorage.getItem(KEY);
          } catch {
            return null;
          }
        },
        set: async (token) => {
          try {
            window.localStorage.setItem(KEY, token);
          } catch {}
        },
        clear: async () => {
          try {
            window.localStorage.removeItem(KEY);
          } catch {}
        },
      }
    : {
        get: () => SecureStore.getItemAsync(KEY),
        set: (token) => SecureStore.setItemAsync(KEY, token),
        clear: () => SecureStore.deleteItemAsync(KEY),
      };

export function memoryTokenStore(initial: string | null = null): TokenStore {
  let token = initial;
  return {
    get: async () => token,
    set: async (value) => {
      token = value;
    },
    clear: async () => {
      token = null;
    },
  };
}
