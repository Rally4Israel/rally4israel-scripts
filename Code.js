function syncEvents() {
  let israelChantsCalendarAPI = new CalendarAPI('israelchants@gmail.com')
  let utcCalendarAPI = new CalendarAPI('5a06bbb46302c8004742ea93e577303b1e0ebdf33e0bd83d0297198a87678723@group.calendar.google.com')
  let eventsSheetsDoc = new SheetsDocAPI('1pQszojsEaFCF5lykzW_LpVCY-3z373xBjr2deU32ZUM').doc
  let rawEventsSheetAPI = new SheetAPI(eventsSheetsDoc, 'Raw Events')
  let filteredEventsSheetAPI = new SheetAPI(eventsSheetsDoc, 'Filtered Events')
  let eventIDMapSheetAPI = new SheetAPI(eventsSheetsDoc, 'Synced Event ID Map')

  let sycner = new RawEventsToUTCSyncer(
    [israelChantsCalendarAPI],
    utcCalendarAPI,
    eventIDMapSheetAPI,
  )
  sycner.sync()

  // let calToSheetSyncer = new CalendarToSheetSyncer(
  //   calendar = israelChantsCalendarAPI.calendar,
  //   sheet = rawEventsSheetAPI.sheet,
  //   startTime = new Date(new Date().getFullYear() - 1, 0, 1), // January 1st of this year
  //   endTime = new Date(new Date().getFullYear() + 2, 0, 1), // January 1st of next year
  // )
  // calToSheetSyncer.sync()

  // let utcCalendarSyncer = new UTCCalendarSyncer(
  //   calendar = utcCalendarAPI.calendar,
  //   sheet = filteredEventsSheetAPI.sheet
  // )
  // utcCalendarSyncer.sync()
}
