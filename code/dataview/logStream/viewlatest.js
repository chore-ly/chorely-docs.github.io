// [TODO] - Fix this JS non-strongly typed non-sense (e.g. cleaner code)
const listEntries = {}
// [TODO] - We could drop the time requirement and have unsorted list items, but for now, keep it mandatory
const timeRegex = /[0-9][0-9]:[0-9][0-9]/
const lastTimestamp = '23:59'
const pathPrefix = 'personal/daily'
const supportTask = false
const partialBadge = ' #partial'
const isFollowUpFilter = dv.current().file?.frontmatter?.followUpFilter === 'true'

// [TODO] - Should we support some basic query abilities? (i.e. and, or, etc)
//        - For now, we'll only support OR to target the greatest availability
const checkPropertyTypes = (propertyName, property) => {
  switch (propertyName) {
    case ('tags'): {
      if (!Array.isArray(property)) {
        log("tags must be a list")
        return false
      }

      return true
    }
    case ('logLinks'): {
      if (!Array.isArray(property)) {
        log("links must be a list")
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

// [TODO] - Maybe index this property or skip it altogether when doing
//        - Recursive list building
const checkPrivateProperty = (list) => {
  return !!list?.tags.find(tag => tag === '#private')
}

const checkFollowUpProperty = (list) => {
  return !!list?.tags.find(tag => tag === '#follow-up')
}

const isLogSection = (list) => {
  return (
    list.header.subpath === 'Log' &&
    list.header.type === 'header'
  )
}

// [NOTE] - Uses OR matching
const matchesProperties = (list, targetTags, targetLinks) => {
  let passing = false

  if (targetTags?.length) {
    const matches = list
      .tags
      .find(tag => targetTags.some(targetTag => tag === `#${targetTag}`))

    if (matches) {
      passing = true
    }
  }

  if (targetLinks?.length) {
    const matches = list
      .outlinks
      .find(outlink => targetLinks.some(targetLink => targetLink.slice(2, -2) === outlink.path))

    if (matches) {
      passing = true
    }
  }

  return passing
}

const isRootListItem = (list, targetTags, targetLinks) => {
  return (
    timeRegex.test(list.text) &&
    !list.parent &&
    matchesProperties(list, targetTags, targetLinks)
  )
}

const indexListItemsToRender = (
  listItem,
  listValues,
  indexedList,
  targetTags,
  targetLinks,
  isFilter = false,
  filterPropertiesMatch = false,
) => {
  const isRootItem = isRootListItem(listItem, targetTags, targetLinks)
  const timestamp = timeRegex.test(listItem.text.slice(0, 5))
    ? listItem.text.slice(0, 5)
    : undefined

  console.log(listItem.text, { filterPropertiesMatch })

  // RootItems render everything
  if (isRootItem) {
    console.log('Adding root', listItem.line)
    const isFilterMatchChained = (
      filterPropertiesMatch ||
      matchesProperties(listItem, targetTags, targetLinks)
    )

    const isRootFilter = isFilter
      ? checkFollowUpProperty(listItem)
      : true

    indexedList.roots[listItem.line] = {
      type: isRootFilter ? 'root' : 'nestedRoot',
      filter: isFilterMatchChained,
      timestamp: timestamp ?? lastTimestamp,
      item: listItem
    }
  }
  else {
    // Otherwise if we have a Tag/Link match and it has no parent, it's a nested (filtered) root
    if (!listItem.parent) {
      console.log('Found root', { isFilter, filterPropertiesMatch })

      const isFilterMatchChained = (
        filterPropertiesMatch ||
        matchesProperties(listItem, targetTags, targetLinks)
      )

      if (indexedList.roots[listItem.line]) {
        if (isFilter) {
          if (filterPropertiesMatch || isFilterMatchChained) {
            console.log('Inserting nested filter', { filterPropertiesMatch })
            indexedList.roots[listItem.line].filter = true
          } else {
            console.log('Removing nested filter', { listItem, filterPropertiesMatch })
          }
        }
      } else {
        if ((isFilter && (filterPropertiesMatch || isFilterMatchChained)) || !isFilter) {
          console.log('Adding nested root', listItem.line)
          indexedList.roots[listItem.line] = {
            type: 'nestedRoot',
            filter: filterPropertiesMatch,
            timestamp: timestamp ?? lastTimestamp,
            item: listItem
          }
        }
      }
    }
    else {
      if (!isFilter) {
        // Add current item if it hasn't been added yet
        if (!indexedList.children[listItem.line]) {
          // console.log('Adding nested item', listItem.line)
          indexedList.children[listItem.line] = listItem
        }

        // If we have a parent that hasn't been added yet, recursively search up
        // [TODO] - This is dangerous because array position only equals line item if the file does
        //          not have any space
        //        - We may need to index all list items on first traversal
        if (!indexedList.children[listItem.parent]) {
          // console.log({ listItem, parent: listValues[listItem.parent - 1], listValues })
          // console.log('Up to ' + (listItem.parent - 1), { listItem, listValues, indexedList })
          indexListItemsToRender(
            listValues[listItem.parent - 1],
            listValues,
            indexedList,
            targetTags,
            targetLinks,
          )
        }
      } else {
        const isFilterMatchChained = (
          filterPropertiesMatch ||
          matchesProperties(listItem, targetTags, targetLinks)
        )

        // Add current item if it hasn't been added yet
        if (!indexedList.filterChildren[listItem.line]?.valid) {
          console.log('Valid ', listItem.text)
          indexedList.filterChildren[listItem.line] = {
            item: listItem,
            valid: isFilterMatchChained
          }

          // If we have a parent that hasn't been added yet, recursively search up
          // [TODO] - This is dangerous because array position only equals line item if the file does
          //          not have any space
          //        - We may need to index all list items on first traversal
          if (!indexedList.filterChildren[listItem.parent]?.valid) {
            console.log('Up - ' + listItem.text, { isFilterMatchChained })
            indexListItemsToRender(
              listValues[listItem.parent - 1],
              listValues,
              indexedList,
              targetTags,
              targetLinks,
              isFilter,
              isFilterMatchChained
            )
          }

          // else if (!indexedList.filterChildren[listItem.parent].valid) {
          //   indexListItemsToRender(
          //     listValues[listItem.parent - 1],
          //     listValues,
          //     indexedList,
          //     targetTags,
          //     targetLinks,
          //     isFilter,
          //     isFilterMatchChained
          //   )
          // }
        }
      }

      // Otherwise we can stop since the current chain has been completed
    }
  }
}

// [TODO] - We can optimize this by actually building the stacks of identified lists
//          instead of just identifying the items to be rendered
// [NOTE] - This also renders both tags and links at the same time
const parseLogs = (page, targetTags, targetLinks) => {
  const indexedList = {
    roots: {},
    children: {},
    filterChildren: {},
  }

  const { path, lists } = page.file
  const listValues = lists.values

  for (const listItem of listValues) {
    if (
      isLogSection(listItem)
    ) {
      if (!isFollowUpFilter) {
        const isMatching = matchesProperties(listItem, targetTags, targetLinks)
        if (isMatching)
          indexListItemsToRender(
            listItem,
            listValues,
            indexedList,
            targetTags,
            targetLinks,
          )
      }
      else if (checkFollowUpProperty(listItem)) {
        indexListItemsToRender(
          listItem,
          listValues,
          indexedList,
          targetTags,
          targetLinks,
          true,
          false,
        )
      }
    }
  }

  const sortedList = {
    roots: Object
      .values(indexedList.roots)
      .sort((a, b) => {
        const [aHour, aMin] = a.item.text.slice(0, 5).split(':')
        const [bHour, bMin] = b.item.text.slice(0, 5).split(':')

        const dateA = dv.luxon.DateTime.fromObject({ hour: aHour, minute: aMin })
        const dateB = dv.luxon.DateTime.fromObject({ hour: bHour, minute: bMin })

        return dateA.toMillis() - dateB.toMillis()
      }),
    children: indexedList.children,
    filterChildren: indexedList.filterChildren
  }

  return sortedList
}

const buildRoot = (
  page,
  list,
  children,
  targetTags,
  targetLinks,
  parentEl,
  isRoot = false,
  renderFilter = false
) => {
  // We're traversing the tree without hitting a tag yet so selectively render
  const renderNestedTarget = renderFilter
    ? children?.[list.line]?.valid
    : children?.[list.line]
  // We've hit a matching tag so render everything underneath,
  // once children is undefined recursively, we render everything
  const renderRootAll = !children
  // Used for class styling only
  const isNestedRoot = children && isRoot

  const isPrivate = checkPrivateProperty(list)
  // [TODO] - This can be optimized by identifying on the first pass in indexListItemsToRender
  const isMatchingRow = renderFilter
    ? checkFollowUpProperty(list)
    : matchesProperties(list, targetTags, targetLinks)
  // [NOW] - If filter row, render all children

  if (isPrivate) {
    return;
  }

  // #follow-up should render all it's children
  // 

  if (isRoot || renderNestedTarget || renderRootAll) {
    console.log(list.text, { list, isRoot, renderNestedTarget, renderRootAll })
    const parentItem = page.lists.values[list.parent - 1]
    // [TODO] - Try to get better/more rich task support ala dv.taskList
    const isSubTask = list.parent && parentItem
      ? parentItem.task
      : false

    // Render regular row
    if (!list.task && !isSubTask)
      dv.el(
        "li",
        list.text,
        {
          container: parentEl,
          ...(isRoot
            ? { cls: isNestedRoot ? 'partial' : 'full' }
            : {}
          )
        }
      )

    // Render Task
    if (list.task && !isSubTask) {
      const task = page.tasks.where(t => t.line === list.line)
      dv.el("li", dv.markdownTaskList(task, false), { container: parentEl })
    }

  }

  if (list?.children?.length) {
    const nestedRoot = dv.el("ul", '', { container: parentEl })

    for (const listChild of list.children) {

      const nextChildren = isMatchingRow
        ? undefined
        : children

      // console.log(listChild.text, { renderFilter, children, isMatchingRow, list, hasTag: checkFollowUpProperty(list) })

      buildRoot(
        page,
        listChild,
        nextChildren,
        targetTags,
        targetLinks,
        nestedRoot,
        false,
        renderFilter
      )
    }
  }
}

const renderLogs = (pageTuples, targetTags, targetLinks) => {
  for (const pageTuple of pageTuples) {
    const [pageName, entry] = pageTuple

    const rootsToRender = entry
      .logs
      .roots
      .filter(root => root.filter === !!isFollowUpFilter)

    if (rootsToRender.length) {
      dv.header(3, `[[${pageName}]]`)

      const liRoot = dv.el("ul", '')

      for (const root of rootsToRender) {
        buildRoot(
          entry.item.file,
          root.item,
          root.type === 'nestedRoot'
            ? root.filter
              ? entry.logs.filterChildren
              : entry.logs.children
            : undefined,
          targetTags,
          targetLinks,
          liRoot,
          true,
          isFollowUpFilter,
        )
      }
    }
  }
}

const renderLogStream = () => {
  let finished = false

  const log = (msg) => dv.span(msg + '<br/>')

  const currentPage = dv.current()
  const { tags, logLinks } = currentPage.file.frontmatter ?? {}

  const targetTags = tags || []
  const originalTargetLinks = logLinks || []
  const targetLinks = [...new Set([...originalTargetLinks, `[[${currentPage.file.name}]]`])]

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

  if (!propertiesToCheck.every(entry => checkPropertyTypes(...entry))) {
    log('Unsupported properties found')
    finished = true
  }

  while (!finished) {
    console.log("Starting loop")

    const prefixPath = (query) => `("${pathPrefix}") and (${query})`

    const targetLinksQuery = prefixPath(
      targetLinks.join(' or ') +
      (isFollowUpFilter ? ' and (#follow-up)' : '')
    )

    // Removve Tags for now
    // const targetTagsQuery = prefixPath(targetTags
    //   .map(tag => `#${tag}`)
    //   .join(' or ')
    // )

    // const finalTagPath = isFollowUpFilter ? prefixPath('#follow-up') : ''

    // Filter out the current page
    // [TODO] - Revisit DataviewJS queries again to see if it's better suited here
    // const tagPages = finalTagPath
    //   ? dv
    //     .pages(finalTagPath)
    //     ?.values
    //     .filter(page => page.file.path !== currentPage.file.path)
    //   ?? []
    //   : []
    const tagPages = []

    const linkPages = targetLinks?.length
      ? dv
        .pages(prefixPath(targetLinksQuery))
        ?.values
        .filter(page => page.file.path !== currentPage.file.path)
      ?? []
      : []

    const parsedPages = {}
    for (const linkPage of linkPages) {
      parsedPages[linkPage.file.name] = {
        item: linkPage,
        logs: undefined
      }
    }

    for (const tagPage of tagPages) {
      parsedPages[tagPage.file.name] = {
        item: tagPage,
        logs: undefined
      }
    }

    for (const pageDate in parsedPages) {
      const entry = parsedPages[pageDate]
      entry.logs = parseLogs(entry.item, targetTags, targetLinks)
    }

    const sortedPages = Object
      .entries(parsedPages)
      .sort((a, b) => {
        const [fileA] = a
        const [fileB] = b

        const dateA = dv.luxon.DateTime.fromFormat(fileA, 'yyyy-MM-dd')
        const dateB = dv.luxon.DateTime.fromFormat(fileB, 'yyyy-MM-dd')

        return dateB.toMillis() - dateA.toMillis()
      })

    renderLogs(
      sortedPages,
      targetTags,
      targetLinks
    )

    console.log({ sortedPages })

    finished = true
  }

  console.log('Finished')

}

renderLogStream()