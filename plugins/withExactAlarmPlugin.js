/** Guarantees the manifest permissions Dues needs for reliable reminders:
 *  - USE_EXACT_ALARM: auto-granted at install (Android 13+); exact alarms fire
 *    even when the process is dead.
 *  - REQUEST_IGNORE_BATTERY_OPTIMIZATIONS: lets the app show the native
 *    one-tap "Allow unrestricted battery" dialog on aggressive OEM skins
 *    (Infinix/XOS, Xiaomi/MIUI, Oppo…).
 *  Must be listed AFTER expo-notifications in app.json so it runs last. */
const { withAndroidManifest } = require('expo/config-plugins');

const REQUIRED = [
  'android.permission.USE_EXACT_ALARM',
  'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
];

module.exports = function withAlarmReliabilityPlugin(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const existing = manifest.manifest['uses-permission'] ?? [];
    for (const name of REQUIRED) {
      const hasIt = existing.some((entry) => entry.$?.['android:name'] === name);
      if (!hasIt) existing.push({ $: { 'android:name': name } });
    }
    manifest.manifest['uses-permission'] = existing;
    return cfg;
  });
};
