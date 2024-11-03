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

function tweet() {
  let airtableAPI = new AirtableAPI(secrets.AIRTABLE.URLS.CALENDAR, ["GCalID"])
  let twitterAPI = new TwitterAPI()
  let twitterPoster = new TwitterPoster(
    airtableAPI, twitterAPI
  )
  twitterPoster.post()
}

function mockTweet() {
  let airtableAPI = new AirtableAPI(secrets.AIRTABLE.URLS.CALENDAR, ["GCalID"])
  let twitterAPI = new MockTwitterAPI()
  let twitterPoster = new TwitterPoster(
    airtableAPI, twitterAPI
  )
  twitterPoster.post()
  twitterAPI.tweets.forEach(tweet => {
    console.log(tweet.message)
  })
}