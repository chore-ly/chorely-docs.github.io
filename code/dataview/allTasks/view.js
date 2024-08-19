const currentPage = dv.current()
const today = dv.luxon.DateTime.now()

const isLogItem = (item) => {
  return (
    item.header.subpath === "Log" &&
    item.header.type === "header"
  )
}

const isSubTask = (task, indexedTasks) => {
  return !!indexedTasks[task?.parent ?? 'root']
}

const log = (msg) => dv.span(msg + '<br/>')

const getProperties = () => {
const { tags, logLinks } = currentPage.file.frontmatter ?? {}

  const targetTags = tags || []
  const targetLinks = logLinks || []

  if (!targetTags && !targetLinks) {
    log('Did not detect any "tags" or "links" properties')
    finished = true
  }

  const propertiesToCheck = Object.entries(
    {
      tags: targetTags,
      logLinks: targetLinks,
    }
  )

  // [TODO] - Should we support some basic query abilities? (i.e. and, or, etc)
  //        - For now, we'll only support OR to target the greatest availability
  const checkPropertyTypes = (propertyName, property) => {
    switch (propertyName) {
      case ('tags'): {
        if (!Array.isArray(property)) {
          log("links must be a list")
          return false
        }

        return true
      }
      case ('logLinks'): {
        if (!Array.isArray(property)) {
          log("tags must be a list")
          return false
        }

        return true
      }
      case ('range'): {
        // [TODO] - Implement date range filtering
        //        - Support plain english terms?
      }
      default: {
        log(`${propertyName} is not yet supported`)
        return false
      }
    }
  }

  if (!propertiesToCheck.every(entry => checkPropertyTypes(...entry))) {
    log('Unsupported properties found')
    finished = true
  }

  return {
    targetTags,
    targetLinks,
  }
}

const matchesProperties = (task, targets) => {
  let passing = false
  const { targetTags, targetLinks } = targets

  if (targetTags?.length) {
    const isAllTag = targetTags.at(0) === 'all'
    
    if (isAllTag)
      passing = true
    else {
      const matches = task
        .tags
        .find(tag => targetTags.some(targetTag => tag === `#${targetTag}`))

      if (matches) {
        passing = true
      }
    }
  }

  if (!passing && targetLinks?.length) {
    const matches = task
      .outlinks
      .find(outlink => targetLinks.some(targetLink => targetLink.slice(2, -2) === outlink.path))

    if (matches) {
      passing = true
    }
  }

  return passing
}

// [TODO] - Consider optimizing this the same way we do for logs (upward recursive)
const deepMatchesProperties = (task, targets) => {
  const rootMatch = matchesProperties(task, targets)
  if (rootMatch)
    return true
  
  return task.children.some(child => deepMatchesProperties(child, targets))
}

const getTaggedPages = (targets) => {
  const pathPrefix = 'personal/daily'
  const prefixPath = (query) => `("${pathPrefix}") and (${query})`
  const { targetLinks, targetTags } = targets
  let indexedPages = { }
  const isAllTag = targetTags?.at(0) === 'all'
  console.log({ isAllTag })

  if (isAllTag) {
    const pages = dv.pages(`"${pathPrefix}"`)
    console.log({ pages: pages.values })

    for (const page of pages.values) {
      indexedPages[page.file.name] = page
    }

    return indexedPages
  }


  const targetLinksQuery = prefixPath(targetLinks.join(' or '))
  const targetTagsQuery = prefixPath(
    targetTags
      .map(tag => `#${tag}`)
      .join(' or ')
  )

  // Filter out the current page
  // [TODO] Filter pages to make sure they match the correct date format?
  const tagPages = targetTags.length
    ? dv
      .pages(prefixPath(targetTagsQuery))
      ?.values
      .filter(page => page.file.path !== currentPage.file.path)
    ?? []
    : []

  const linkPages = targetLinks.length
    ? dv
      .pages(prefixPath(targetLinksQuery))
      ?.values
      .filter(page => page.file.path !== currentPage.file.path)
    ?? []
    : []

  const combinedPages = [...tagPages, ...linkPages]
  
  
  for (const page of combinedPages) {
    indexedPages[page.file.name] = page
  }

  return indexedPages
}

const formatTasks = (indexedPages, targets) => {
  const tasks = {
    overdue: {
      uncompleted: []
    },
    today: {
      completed: [],
      uncompleted: [],
    },
    week: {
      completed: [],
      uncompleted: [],
    },
    month: {
      completed: [],
      uncompleted: [],
    },
    all: {
      completed: [],
      uncompleted: [],
    }
  }

  for (const page of Object.values(indexedPages)) {
    const pageTasks = page.file.tasks.values
    const indexedTasks = { }

    for (const pageTask of pageTasks) {
      indexedTasks[pageTask.line] = pageTask
    }

    for (const task of page.file.tasks.values) {
      if (
          isLogItem(task) &&
          !isSubTask(task, indexedTasks) &&
          deepMatchesProperties(task, targets)
        ) {
        const isCompleted = task.completed
        const today = dv.luxon.DateTime.now()
        const newDay = today.set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
        
        const isDueToday = task.due?.hasSame(today, 'day')
        const isDueWeek = task.due?.hasSame(today, 'week')
        const isDueMonth = task.due?.hasSame(today, 'month')
        
        if (task.due) {
          task.due.set({ hour: 0, minute: 0 })
        }
        
        const isOverdue = task.due < newDay

        if (isOverdue) {
          console.log({ task, isOverdue, today, newDay })

          if (!task.completed)
            tasks.overdue.uncompleted.push(task)
        }
        else if (isDueToday) {
          if (isCompleted)
            tasks.today.completed.push(task)
          else
            tasks.today.uncompleted.push(task)
        }
        else if (isDueWeek && !isDueToday) {
          if (isCompleted)
            tasks.week.completed.push(task)
          else
            tasks.week.uncompleted.push(task)
        }
        else if (isDueMonth && !isDueWeek && !isDueToday) {
          console.log("Month", task)
          
          if (isCompleted)
            tasks.month.completed.push(task)
          else
            tasks.month.uncompleted.push(task)
        }
        else if (isCompleted)
          tasks.all.completed.push(task)
        else
          tasks.all.uncompleted.push(task)
      }
    }
  }

  return tasks
}

const renderTaskList = (
  tasks,
  title,
  titleSize = 4,
  // [TODO] - We can probably differentiate between no items and all finished items
  emptyMessage = 'All finished, good job! 👍'
)  => {
  dv.header(titleSize, title, { cls: 'task-section' })
  if (tasks.length) {
    dv.taskList(tasks, false)
  }
  else {
    dv.span(emptyMessage, { cls: 'subtle-text'})
  }
}

const renderTasks = (tasks) => {
  // [TODO] - Also Sort?
  renderTaskList(tasks.overdue.uncompleted, 'Overdue', 4)
  dv.span('<br/><br/>')
  dv.span('---')

  renderTaskList(tasks.today.uncompleted, 'Due Today', 4)
  dv.span('<br/><br/>')
  dv.span('---')

  renderTaskList(tasks.week.uncompleted, 'Due This Week', 4)
  dv.span('<br/><br/>')
  dv.span('---')

  renderTaskList(tasks.month.uncompleted, 'Due This Month', 4)
  dv.span('<br/><br/>')
  dv.span('---')

  renderTaskList(tasks.all.uncompleted, 'Uncompleted', 5)
  dv.span('<br/><br/>')
  dv.span('---')

}

const renderTaskStream = () => {
  let finished = false


  while (!finished) {
    console.log("Starting loop")

    const targets = getProperties(currentPage)
    const indexedPages = getTaggedPages(targets)
    const tasks = formatTasks(indexedPages, targets)
    renderTasks(tasks)

    console.log({ targets, indexedPages, tasks })

    finished = true

  }
  console.log('Finished')
}

renderTaskStream()