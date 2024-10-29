function syncEvents() {
  let israelChantsCalendarAPI = new GCalAPI('israelchants@gmail.com')
  let airtableEventsAPI = new AirtableAPI(secrets.AIRTABLE_EVENTS_URL, ["GCalID"])
  let airtableUsersAPI = new AirtableAPI(secrets.AIRTABLE_USERS_URL, ["Email"])

  let sycner = new GCalToAirtableSyncer(
    [israelChantsCalendarAPI],
    airtableEventsAPI,
    airtableUsersAPI
  )
  sycner.sync()
}
