import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    // Rapier ships its WASM physics engine inlined (~2 MB), so the physics chunk is large by design.
    chunkSizeWarningLimit: 2600,
    rolldownOptions: {
      output: {
        // Split heavy, rarely-changing libraries into their own cacheable chunks.
        codeSplitting: {
          groups: [
            // Higher priority wins when a module matches several groups.
            { name: 'react', test: /node_modules[\/](react|react-dom|react-reconciler|scheduler|zustand|use-sync-external-store|its-fine|suspend-react)[\/]|vite[\/]preload-helper/, priority: 50 },
            { name: 'three', test: /node_modules[\/]three[\/]/, priority: 40 },
            { name: 'physics', test: /@dimforge|@react-three[\/]rapier/, priority: 30 },
            { name: 'postfx', test: /node_modules[\/](postprocessing|n8ao|@react-three[\/]postprocessing)/, priority: 20 },
            { name: 'r3f', test: /@react-three[\/](fiber|drei)|camera-controls|three-stdlib|troika/, priority: 35 },
          ],
        },
      },
    },
  },
})
