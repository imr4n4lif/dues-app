import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * True when running inside the Expo Go sandbox.
 *
 * Since SDK 53, Expo Go no longer supports expo-notifications on Android.
 * The app degrades gracefully: reminders stay configurable-but-inert and the
 * UI explains that a development build (`npx expo run:android`) is required.
 */
export const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
