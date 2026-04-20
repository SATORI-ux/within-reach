import { defineConfig } from 'vite'
import { existsSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const isPrivateBuild =
    process.env.VITE_WITHIN_REACH_BUILD === 'private' || process.env.VITE_PRIVATE_BUILD === 'true' || mode === 'private'
  const privateLetterPath = fileURLToPath(new URL('./kept.html', import.meta.url))
  const input = {
    main: fileURLToPath(new URL('./index.html', import.meta.url)),
  }

  if (isPrivateBuild && existsSync(privateLetterPath)) {
    input.kept = privateLetterPath
  }

  return {
    base: '/',
    resolve: {
      alias: {
        './private-copy.js': fileURLToPath(
          new URL(isPrivateBuild ? './js/private-copy.js' : './js/private-copy.public.js', import.meta.url)
        ),
      },
    },
    build: {
      emptyOutDir: true,
      rollupOptions: {
        input,
      },
    },
  }
})
