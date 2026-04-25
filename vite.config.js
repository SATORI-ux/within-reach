import { defineConfig } from 'vite'
import { existsSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const wantsPrivateBuild =
    process.env.VITE_WITHIN_REACH_BUILD === 'private' || process.env.VITE_PRIVATE_BUILD === 'true' || mode === 'private'
  const allowPrivateBuild = process.env.VITE_ENABLE_PRIVATE_BUILD === 'true'
  const strictPublicBuild = process.env.VITE_STRICT_PUBLIC_BUILD !== 'false'
  const isPrivateBuild = wantsPrivateBuild && allowPrivateBuild
  const privateLetterPath = fileURLToPath(new URL('./kept.html', import.meta.url))
  const privateCopyPath = fileURLToPath(new URL('./js/private-copy.js', import.meta.url))
  const publicCopyPath = fileURLToPath(new URL('./js/private-copy.public.js', import.meta.url))
  const privateWhisperPath = fileURLToPath(new URL('./js/private-whisper.js', import.meta.url))
  const publicWhisperPath = fileURLToPath(new URL('./js/private-whisper.public.js', import.meta.url))
  const input = {
    main: fileURLToPath(new URL('./index.html', import.meta.url)),
  }

  if (wantsPrivateBuild && strictPublicBuild && !allowPrivateBuild) {
    throw new Error(
      'Private build requested without VITE_ENABLE_PRIVATE_BUILD=true. Public builds now fail closed by default.'
    )
  }

  if (isPrivateBuild && existsSync(privateLetterPath)) {
    input.kept = privateLetterPath
  }

  return {
    base: '/',
    resolve: {
      alias: {
        './private-copy.js': isPrivateBuild && existsSync(privateCopyPath) ? privateCopyPath : publicCopyPath,
        './private-whisper.js':
          isPrivateBuild && existsSync(privateWhisperPath) ? privateWhisperPath : publicWhisperPath,
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
