export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to safely get Env variables in Vite or Node
export const getEnv = (key: string): string => {
  // Check Vite's import.meta.env
  // Fix: Cast import.meta to any to resolve "Property 'env' does not exist on type 'ImportMeta'"
  const meta = import.meta as any;
  if (meta && meta.env && meta.env[`VITE_${key}`]) {
    return meta.env[`VITE_${key}`];
  }
  // Check process.env (if defined via DefinePlugin or Node)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] || '';
  }
  return '';
};