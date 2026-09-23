/// <reference types="vite/client" />

interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export {};
