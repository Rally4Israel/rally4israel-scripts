const { SocialPoster } = require("../../../socialPosters")
const { MockTwitterAPI, MockAirtableAPI, MockFacebookAPI } = require("../../../mockers")

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

function createEvent({
    title = "Default Event",
    start = "2024-10-14T17:45:00.000Z",
    allDay = false,
    location = "",
    recurringEventId = "",
} = {}) {
    return {
        fields: {
            Title: title,
            "All Day": allDay,
            Start: start,
            Location: location,
            "Recurring Event ID": recurringEventId
        }
    };
}

function createPoster(events = []) {
    const airtableEventsAPI = getAirtableEventsAPI(events);
    const twitterAPI = new MockTwitterAPI();
    const facebookAPI = new MockFacebookAPI();
    return new SocialPoster(airtableEventsAPI, twitterAPI, facebookAPI);
}

describe('Tweets', () => {


    test('Starts thread with intro tweet', () => {
        let poster = createPoster([
            createEvent({ title: "Some Event" })
        ])
        poster.post()

        expect(poster.twitterAPI.tweets.length).toStrictEqual(2) // Intro + Event
    })

    test('Post includes event title', () => {
        const title = "Some Event"
        let poster = createPoster([
            createEvent({ title: title, start: "2024-10-14T17:45:00.000Z" })
        ])
        poster.post()

        const lastTweet = getLatestTweet(poster.twitterAPI).message
        expect(lastTweet).toContain(title)
    })

    describe('Event time', () => {
        test('Shows time and date if event has a time', () => {
            let poster = createPoster([
                createEvent({ start: "2024-10-14T17:45:00.000Z", allDay: false })
            ])
            poster.post()

            const lastTweet = getLatestTweet(poster.twitterAPI).message
            const date = "Monday, Oct 14"
            const time = "5:45 pm"
            expect(lastTweet).toContain(date)
            expect(lastTweet).toContain(time)
        })
        test('Shows only date if event is all day', () => {
            let poster = createPoster([
                createEvent({ start: "2024-10-14T00:00:00.000Z", allDay: true })
            ])
            poster.post()
            const lastTweet = getLatestTweet(poster.twitterAPI).message
            const date = "Monday, Oct 14"
            const time = "12:00 am"
            expect(lastTweet).toContain(date)
            expect(lastTweet).not.toContain(time)
        })
    })

    test('Includes location if event has one', () => {
        const location = "123 Sesame St, NY"
        let poster = createPoster([createEvent({ location: location })])
        poster.post()
        const lastTweet = getLatestTweet(poster.twitterAPI).message
        expect(lastTweet).toContain(`📌`)
        expect(lastTweet).toContain(`${location}`)
    })

    test('Skips location if there is none', () => {
        const location = ""
        let poster = createPoster([createEvent({ location: location })])
        poster.post()
        const lastTweet = getLatestTweet(poster.twitterAPI).message
        expect(lastTweet).not.toContain(`📌`)
    })

    describe('Event filtering', () => {
        test('Only posts future events', () => {
            let poster = createPoster([
                createEvent({ title: "Past Event", start: "2020-10-14T17:45:00.000Z" }),
                createEvent({ title: "Future Event", start: "2022-10-14T17:45:00.000Z" }),
            ])
            poster.post()

            expect(poster.twitterAPI.tweets.length).toBe(2) // Intro + Future Event
            const lastTweet = getLatestTweet(poster.twitterAPI).message
            expect(lastTweet).toContain("Future Event")
        })
        test('Sorts events by start time', () => {
            let poster = createPoster([
                createEvent({ title: "Event 3", start: "2022-03-14T17:45:00.000Z" }),
                createEvent({ title: "Event 1", start: "2022-01-14T17:45:00.000Z" }),
                createEvent({ title: "Event 2", start: "2022-02-14T17:45:00.000Z" }),
            ])
            poster.post()

            let tweets = poster.twitterAPI.tweets
            expect(tweets[1].message).toContain("Event 1")
            expect(tweets[2].message).toContain("Event 2")
            expect(tweets[3].message).toContain("Event 3")

        })

        test('Does not post if no future events', () => {
            let poster = createPoster([
                createEvent({ title: "Past Event", start: "2020-10-14T17:45:00.000Z" })
            ])
            poster.post()

            expect(poster.twitterAPI.tweets.length).toBe(0)
        })

        test('Only posts earliest upcoming instance of recurring event', () => {
            let recurringEventId = "some-id"
            let poster = createPoster([
                createEvent({
                    title: "Past Event",
                    start: "2020-10-14T17:45:00.000Z",
                    recurringEventId: recurringEventId
                }),
                createEvent({
                    title: "Upcoming Event",
                    start: "2021-10-14T17:45:00.000Z",
                    recurringEventId: recurringEventId
                }),
                createEvent({
                    title: "Later Event",
                    start: "2022-10-14T17:45:00.000Z",
                    recurringEventId: recurringEventId
                }),
            ])
            poster.post()
            expect(poster.twitterAPI.tweets.length).toBe(2) // Intro + Event
            const lastTweet = getLatestTweet(poster.twitterAPI).message
            expect(lastTweet).toContain("Upcoming Event")
        })
        test('Includes events for next 10 days', () => {
            let days = [1, 2, 3, 4, 5, 11, 12]
            let events = days.map(day => {
                paddedDay = String(day).padStart(2, "0")
                return createEvent({
                    title: `Day ${day} Event`,
                    start: `2021-01-${paddedDay}T00:00:00Z`
                })
            })
            let poster = createPoster(events)
            poster.post()

            expect(poster.twitterAPI.tweets.length).toBe(7) // Intro + 6 events
            const lastTweet = getLatestTweet(poster.twitterAPI).message
            expect(lastTweet).not.toContain("Day 12")
        })
        test('Includes next 5 events if fewer than 5 in next 10 days', () => {
            let days = [2, 3, 4, 11, 12]
            let events = days.map(day => {
                paddedDay = String(day).padStart(2, "0")
                return createEvent({
                    title: `Day ${day} Event`,
                    start: `2021-01-${paddedDay}T00:00:00Z`
                })
            })
            let poster = createPoster(events)
            poster.post()

            expect(poster.twitterAPI.tweets.length).toBe(6) // Intro + 5 events
            const lastTweet = getLatestTweet(poster.twitterAPI).message
            expect(lastTweet).toContain("12")
        })
    })
})

describe("Facebook Posts", () => {
    test('Includes Events in post', () => {
        let poster = createPoster([
            createEvent({ title: "Event 1", start: "2022-01-14T17:45:00.000Z" }),
            createEvent({ title: "Event 2", start: "2022-02-14T17:45:00.000Z" })
        ])
        poster.post()

        let post = poster.facebookAPI.posts[0]
        expect(post).toContain("Event 1")
        expect(post).toContain("Event 2")
    })
})