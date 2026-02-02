import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { AppConfig } from '../types';

const DEFAULT_CONFIG: AppConfig = {
  version: '1.0',
  excludeNamespaces: ['kube-system', 'kube-public', 'kube-node-lease'],
  settings: {
    pollingInterval: 5000,
    scalingEnabled: true,
  },
};

const configPath = process.env.CONFIG_PATH || path.join(__dirname, '../../../config/namespaces.yaml');

export function loadConfig(): AppConfig {
  try {
    if (!fs.existsSync(configPath)) {
      console.warn(`Config file not found at ${configPath}, using defaults`);
      return DEFAULT_CONFIG;
    }

    const fileContent = fs.readFileSync(configPath, 'utf-8');
    const parsed = YAML.parse(fileContent) as AppConfig;

    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      excludeNamespaces: parsed.excludeNamespaces ?? DEFAULT_CONFIG.excludeNamespaces,
      settings: {
        ...DEFAULT_CONFIG.settings,
        ...parsed.settings,
      },
    };
  } catch (error) {
    console.error('Error loading config:', error);
    return DEFAULT_CONFIG;
  }
}

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

export function reloadConfig(): AppConfig {
  cachedConfig = loadConfig();
  return cachedConfig;
}

// Watch config file for changes and auto-reload
if (fs.existsSync(configPath)) {
  fs.watch(configPath, (eventType) => {
    if (eventType === 'change') {
      console.log('Config file changed, reloading...');
      cachedConfig = loadConfig();
      console.log(`Reloaded config, excluding: ${cachedConfig.excludeNamespaces.join(', ')}`);
    }
  });
}
