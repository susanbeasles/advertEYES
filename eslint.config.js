import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(js.configs.recommended,tseslint.configs.recommended,{files:['src/**/*.ts','src/**/*.tsx','tests/**/*.ts'],languageOptions:{globals:{window:'readonly',document:'readonly',fetch:'readonly',setInterval:'readonly',clearInterval:'readonly',setTimeout:'readonly',innerWidth:'readonly',console:'readonly',AbortController:'readonly',structuredClone:'readonly'}}});
