/*
 Resources
 - http://qunitgs2.com/
 - qunit tutorial https://www.youtube.com/watch?v=9x-l-VW_bWI&list=PLIz7FUBFbjZ22LGs00HnnEnHH8zeW1CGh&index=1 
*/

function syncEvents() {
  israelChantsCalendarAPI = new CalendarAPI('israelchants@gmail.com')
  rawEventsSheetAPI = new SheetAPI('1pQszojsEaFCF5lykzW_LpVCY-3z373xBjr2deU32ZUM', 'Raw Events')
  let syncer = new CalendarToSheetSyncer(
    calendar = israelChantsCalendarAPI.calendar,
    sheet = rawEventsSheetAPI.sheet,
    startTime = new Date(new Date().getFullYear() - 1, 0, 1), // January 1st of this year
    endTime = new Date(new Date().getFullYear() + 2, 0, 1), // January 1st of next year
  )
  syncer.sync()

  utcCalendarAPI = new CalendarAPI('5a06bbb46302c8004742ea93e577303b1e0ebdf33e0bd83d0297198a87678723@group.calendar.google.com')
  filteredEventsSheetAPI = new SheetAPI('1pQszojsEaFCF5lykzW_LpVCY-3z373xBjr2deU32ZUM', 'Filtered Events')
  let utcCalendarSyncer = new UTCCalendarSyncer(
    calendar = utcCalendarAPI.calendar,
    sheet = filteredEventsSheetAPI.sheet
  )
  utcCalendarSyncer.sync()
}
