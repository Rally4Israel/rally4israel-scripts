function syncEvents() {
  let israelChantsCalendarAPI = new GCalAPI('israelchants@gmail.com')
  let airtableEventsAPI = new AirtableAPI(secrets.AIRTABLE.URLS.EVENTS, ["GCalID"])
  let airtableUsersAPI = new AirtableAPI(secrets.AIRTABLE.URLS.USERS, ["Email"])

  let sycner = new GCalToAirtableSyncer(
    [israelChantsCalendarAPI],
    airtableEventsAPI,
    airtableUsersAPI
  )
  sycner.sync()
}
