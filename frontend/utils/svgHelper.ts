import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

export const loadSvgContent = async (assetModule: number): Promise<string> => {
  try {
    const asset = Asset.fromModule(assetModule);
    await asset.downloadAsync();
    
    if (asset.localUri) {
      const content = await FileSystem.readAsStringAsync(asset.localUri);
      return content;
    }
    throw new Error('Could not load SVG content');
  } catch (error) {
    console.error('Error loading SVG:', error);
    return '';
  }
};