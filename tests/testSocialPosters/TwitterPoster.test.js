const { TwitterPoster } = require("../../socialPosters")
const { MockTwitterAPI, MockAirtableAPI } = require("../mockers")

function getAirtableEventsAPI(initialRecords = []) {
    return new MockAirtableAPI(initialRecords, ["GCalID"])
}

function getLatestTweet(twitterAPI) {
    return twitterAPI.tweets.slice(-1)[0]
}

test('Starts thread with intro tweet', () => {
    let airtableEventsAPI = getAirtableEventsAPI([{
        fields: { Title: "Some Event" }
    }])
    let twitterAPI = new MockTwitterAPI()
    let poster = new TwitterPoster(
        airtableEventsAPI, twitterAPI
    )
    poster.post()

    expect(twitterAPI.tweets.length).toStrictEqual(2) // Intro + Event
})

test('Post includes event title', () => {
    const title = "Some Event"
    let airtableEventsAPI = getAirtableEventsAPI([{
        fields: { Title: title }
    }])
    let twitterAPI = new MockTwitterAPI()
    let poster = new TwitterPoster(
        airtableEventsAPI, twitterAPI
    )
    poster.post()

    const lastTweet = getLatestTweet(twitterAPI).message
    expect(lastTweet.includes(title)).toBe(true)
})

describe('Event time', () => {
    test('Shows time and date if event has a time', () => {
        let airtableEventsAPI = getAirtableEventsAPI([{
            fields: {
                Title: "Some Event",
                "All Day": false,
                Start: "2024-10-14T17:45:00.000Z"
            }
        }])
        let twitterAPI = new MockTwitterAPI()
        let poster = new TwitterPoster(
            airtableEventsAPI, twitterAPI
        )
        poster.post()

        const lastTweet = getLatestTweet(twitterAPI).message
        const date = "Monday, Oct 14"
        const time = "5:45 pm"
        expect(lastTweet.includes(date)).toBe(true)
        expect(lastTweet.includes(time)).toBe(true)
    })
    test('Shows only date if event is all day', () => {
        let airtableEventsAPI = getAirtableEventsAPI([{
            fields: {
                Title: "Some Event",
                "All Day": true,
                Start: "2024-10-14T00:00:00.000Z"

            }
        }])
        let twitterAPI = new MockTwitterAPI()
        let poster = new TwitterPoster(
            airtableEventsAPI, twitterAPI
        )
        poster.post()
        const lastTweet = getLatestTweet(twitterAPI).message
        const date = "Monday, Oct 14"
        const time = "12:00 am"
        expect(lastTweet.includes(date)).toBe(true)
        expect(lastTweet.includes(time)).toBe(false)
    })
})

test('Includes location if event has one', () => {
    const location = "123 Sesame St, NY"
    let airtableEventsAPI = getAirtableEventsAPI([{
        fields: {
            Title: "Some Event",
            "All Day": true,
            Start: "2024-10-14T00:00:00.000Z",
            Location: location

        }
    }])
    let twitterAPI = new MockTwitterAPI()
    let poster = new TwitterPoster(
        airtableEventsAPI, twitterAPI
    )
    poster.post()
    const lastTweet = getLatestTweet(twitterAPI).message
    expect(lastTweet.includes(`📌`)).toBe(true)
    expect(lastTweet.includes(`${location}`)).toBe(true)
})

test('Skips location if there is none', () => {
    const location = ""
    let airtableEventsAPI = getAirtableEventsAPI([{
        fields: {
            Title: "Some Event",
            "All Day": true,
            Start: "2024-10-14T00:00:00.000Z",
            Location: location

        }
    }])
    let twitterAPI = new MockTwitterAPI()
    let poster = new TwitterPoster(
        airtableEventsAPI, twitterAPI
    )
    poster.post()
    const lastTweet = getLatestTweet(twitterAPI).message
    expect(lastTweet.includes(`📌`)).toBe(false)
})