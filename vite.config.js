import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const isPrivateBuild =
    process.env.VITE_WITHIN_REACH_BUILD === 'private' || process.env.VITE_PRIVATE_BUILD === 'true' || mode === 'private'

  return {
    base: '/within-reach/',
    resolve: {
      alias: {
        './private-copy.js': fileURLToPath(
          new URL(isPrivateBuild ? './js/private-copy.js' : './js/private-copy.public.js', import.meta.url)
        ),
      },
    },
  }
})
