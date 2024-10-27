function syncEvents() {
  let israelChantsCalendarAPI = new CalendarAPI('israelchants@gmail.com')
  let utcCalendarAPI = new CalendarAPI('5a06bbb46302c8004742ea93e577303b1e0ebdf33e0bd83d0297198a87678723@group.calendar.google.com')
  let eventsSheetsDoc = new SheetsDocAPI('1pQszojsEaFCF5lykzW_LpVCY-3z373xBjr2deU32ZUM').doc
  let eventIDMapSheetAPI = new SheetAPI(eventsSheetsDoc, 'Synced Event ID Map')
  let usersSheetAPI = new SheetAPI(eventsSheetsDoc, 'Users')

  let sycner = new RawEventsToUTCSyncer(
    [israelChantsCalendarAPI],
    utcCalendarAPI,
    eventIDMapSheetAPI,
    usersSheetAPI
  )
  sycner.sync()
}
