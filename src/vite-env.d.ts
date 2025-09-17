/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_TEST_CLIENT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}