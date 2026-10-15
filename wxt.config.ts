import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Sonner Applier',
    description: 'Carrega e organiza as vagas da busca atual no Indeed.',
    version: '1.0.0',
    permissions: ['activeTab', 'scripting', 'storage'],
    host_permissions: ['https://*.indeed.com/*'],
  },
});
