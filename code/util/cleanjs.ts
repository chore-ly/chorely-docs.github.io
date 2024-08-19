import fs from 'node:fs/promises'

(async () => {  
  const filesToClean = (await fs.readFile('./changed.temp').catch(err => {
    return ''
  }))
    .toString()
    .split('\n')
    .filter(path => path)

  console.log({ filesToClean })

  filesToClean.forEach(async (filePath) => {
    const tokens = filePath.split("/")
    const directory = tokens.slice(0,-1).join('/')
    const fileName = tokens.at(-1)

    const file = await fs.readFile(filePath)

    if (!file) {
      console.log('No file to open')
    }

    const lines = file.toString().split('\n')
    // console.log({ lines })
    
    if (lines.at(0)?.includes('use strict')) {
      const output = lines.slice(2).join('\n')
      console.log("Writing new file to ", filePath)
      await fs.writeFile(filePath, output)
    }
  })

  await fs.writeFile('./changed.temp', '')
})();