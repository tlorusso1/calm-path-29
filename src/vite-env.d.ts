/// <reference types="vite/client" />

// Declaração para importar CSV como raw string
declare module '*.csv?raw' {
  const content: string;
  export default content;
}
