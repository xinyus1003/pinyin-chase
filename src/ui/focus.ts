export function preventFocusTransfer(event: Pick<Event, 'preventDefault'>): void {
  event.preventDefault();
}
