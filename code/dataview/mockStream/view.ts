import type { DataviewInlineApi } from "obsidian-dataview/lib/api/inline-api";

declare const dv: DataviewInlineApi 

const render = () => {
  const currentPage = dv.current()
  const figmaProperty = currentPage.figma

  if (!figmaProperty || !figmaProperty?.length) {
    dv.el('span', '(No mocks found)')
    return;
  }

  const flexContainer = dv.el('div', '', { cls: 'flexContainer'})

  dv.el(
    'iframe',
    undefined,
    {
      container: flexContainer,
      cls: 'flexItem',
      attr: {
        src: `https://www.figma.com/embed?embed_host=share&url=${figmaProperty}`,
        style: "border: 1px solid rgba(0, 0, 0, 0.1);",
        class: 'flexItem'
      }
    }
  )

}
render()
