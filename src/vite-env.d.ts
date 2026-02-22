/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENROUTER_API_KEY: string;
  /** Admin login PIN (e.g. 723899). Not committed to git. */
  readonly VITE_ADMIN_PIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
