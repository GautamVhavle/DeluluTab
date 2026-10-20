/** The widget currently being dragged out of the gallery. Same-page, so dragover can read it. */
let draggingId: string | null = null

export function setDraggingWidget(id: string | null) {
  draggingId = id
}

export function draggingWidget() {
  return draggingId
}
