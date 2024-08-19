import nodemon from 'nodemon'
import fs from 'node:fs/promises'

nodemon({
  script: './util/cleanjs.ts',
  ext: 'js',
  ignoreRoot: ['./**/*/clean_*'],
  watch: ['./**/*/*.js']
})
.on('restart', files => {
  console.log({ changedFiles: files })
  // @ts-expect-error
  fs.writeFile('./changed.temp', files.join('/n'))
})