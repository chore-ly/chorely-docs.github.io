// [TODO] - Consider making this generic via page properties?
const render = () => {
  console.log('Starting Refine Page')
  const pages = dv
    .pages('(#refine) and -"templates"')
    .sort(p => p.file.cday.ts, 'DESC')
  const listContainer = dv.el('ul', '')
  
  for (const page of pages.values) {
    console.log({
      page,
      filePath: page.file.link.path
    })
    
    dv.el('li', dv.fileLink(page.file.link.path), { container: listContainer })
  }

  console.log('Finished Refine Page')
}

render()