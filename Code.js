
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

function post() {
  let airtableAPI = new AirtableAPI(secrets.AIRTABLE.URLS.CALENDAR, ["GCalID"])
  let twitterAPI = new TwitterAPI()
  let facebookAPI = new FacebookAPI()
  let socialPoster = new SocialPoster(
    airtableAPI, twitterAPI, facebookAPI
  )
  socialPoster.post()
}

function testTweet() {
  let twitterAPI = new TwitterAPI()
  twitterAPI.sendTweetThread(["Test"])
}

function testFacebookPost() {
  new FacebookAPI().post("Testing something...")
}

function mockPost() {
  let airtableAPI = new AirtableAPI(secrets.AIRTABLE.URLS.CALENDAR, ["GCalID"])
  let twitterAPI = new MockTwitterAPI()
  let facebookAPI = new MockFacebookAPI()
  let socialPoster = new SocialPoster(
    airtableAPI, twitterAPI, facebookAPI
  )
  socialPoster.post()
  twitterAPI.tweets.forEach(tweet => {
    console.log(tweet.message)
  })
  facebookAPI.posts.forEach(post => {
    console.log(post)
  })
}