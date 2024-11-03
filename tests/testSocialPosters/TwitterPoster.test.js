const { TwitterPoster } = require("../../socialPosters")
const { MockTwitterAPI, MockAirtableAPI } = require("../mockers")

function getAirtableEventsAPI(initialRecords = []) {
    return new MockAirtableAPI(initialRecords, ["GCalID"])
}

function getLatestTweet(twitterAPI) {
    return twitterAPI.tweets.slice(-1)[0]
}

beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2021-01-01T00:00:00Z').getTime());
});

afterEach(() => {
    jest.useRealTimers()
});

test('Starts thread with intro tweet', () => {
    let airtableEventsAPI = getAirtableEventsAPI([{
        fields: { Title: "Some Event", Start: "2024-10-14T17:45:00.000Z" }
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
        fields: { Title: title, Start: "2024-10-14T17:45:00.000Z" }
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

describe('Event filtering', () => {
    test('Only posts future events', () => {
        let airtableEventsAPI = getAirtableEventsAPI([{
            fields: {
                Title: "Past Event",
                Start: "2020-10-14T17:45:00.000Z"
            }
        },
        {
            fields: {
                Title: "Future Event",
                Start: "2022-10-14T17:45:00.000Z"
            }
        }])
        let twitterAPI = new MockTwitterAPI()
        let poster = new TwitterPoster(
            airtableEventsAPI, twitterAPI
        )
        poster.post()

        expect(twitterAPI.tweets.length).toBe(2) // Intro + Future Event
        const lastTweet = getLatestTweet(twitterAPI).message
        expect(lastTweet.includes("Future Event")).toBe(true)
    })
    test('Sorts events by start time', () => {
        let airtableEventsAPI = getAirtableEventsAPI([{
            fields: {
                Title: "Event 3",
                Start: "2022-03-14T17:45:00.000Z"
            }
        },
        {
            fields: {
                Title: "Event 1",
                Start: "2022-01-14T17:45:00.000Z"
            }
        },
        {
            fields: {
                Title: "Event 2",
                Start: "2022-02-14T17:45:00.000Z"
            }
        }])
        let twitterAPI = new MockTwitterAPI()
        let poster = new TwitterPoster(
            airtableEventsAPI, twitterAPI
        )
        poster.post()

        let tweets = twitterAPI.tweets
        expect(tweets[1].message.includes("Event 1")).toBe(true)
        expect(tweets[2].message.includes("Event 2")).toBe(true)
        expect(tweets[3].message.includes("Event 3")).toBe(true)

    })

    test('Does not post if no future events', () => {
        let airtableEventsAPI = getAirtableEventsAPI([{
            fields: {
                Title: "Past Event",
                Start: "2020-10-14T17:45:00.000Z"
            }
        }])
        let twitterAPI = new MockTwitterAPI()
        let poster = new TwitterPoster(
            airtableEventsAPI, twitterAPI
        )
        poster.post()

        expect(twitterAPI.tweets.length).toBe(0)
    })

    test('Only posts earliest upcoming instance of recurring event', () => {
        let recurringEventId = "some-id"
        let airtableEventsAPI = getAirtableEventsAPI([{
            fields: {
                Title: "Past Event",
                Start: "2020-10-14T17:45:00.000Z",
                "Recurring Event ID": recurringEventId
            }
        },
        {
            fields: {
                Title: "Upcoming Event",
                Start: "2021-10-14T17:45:00.000Z",
                "Recurring Event ID": recurringEventId
            }
        },
        {
            fields: {
                Title: "Later Event",
                Start: "2022-10-14T17:45:00.000Z",
                "Recurring Event ID": recurringEventId
            }
        }
        ])
        let twitterAPI = new MockTwitterAPI()
        let poster = new TwitterPoster(
            airtableEventsAPI, twitterAPI
        )
        poster.post()
        expect(twitterAPI.tweets.length).toBe(2) // Intro + Event
        const lastTweet = getLatestTweet(twitterAPI).message
        expect(lastTweet.includes("Upcoming Event")).toBe(true)
    })
    test('Includes events for next 10 days', () => {
        let days = [2, 3, 4, 5, 6, 11, 12]
        let events = days.map(day => {
            paddedDay = String(day).padStart(2, "0")
            return {
                fields: {
                    Title: `Day ${day} Event`,
                    Start: `2021-01-${paddedDay}T00:00:00Z`
                }
            }
        })
        let airtableEventsAPI = getAirtableEventsAPI(events)
        let twitterAPI = new MockTwitterAPI()
        let poster = new TwitterPoster(
            airtableEventsAPI, twitterAPI
        )
        poster.post()

        expect(twitterAPI.tweets.length).toBe(7) // Intro + 6 events
        const lastTweet = getLatestTweet(twitterAPI).message
        expect(lastTweet.includes("Day 12")).toBe(false)
    })
    test('Includes next 5 events if fewer than 5 in next 10 days', () => {
        let days = [2, 3, 4, 11, 12]
        let events = days.map(day => {
            paddedDay = String(day).padStart(2, "0")
            return {
                fields: {
                    Title: `Day ${day} Event`,
                    Start: `2021-01-${paddedDay}T00:00:00Z`
                }
            }
        })
        let airtableEventsAPI = getAirtableEventsAPI(events)
        let twitterAPI = new MockTwitterAPI()
        let poster = new TwitterPoster(
            airtableEventsAPI, twitterAPI
        )
        poster.post()

        expect(twitterAPI.tweets.length).toBe(6) // Intro + 5 events
        const lastTweet = getLatestTweet(twitterAPI).message
        expect(lastTweet.includes("12")).toBe(true)
    })
})