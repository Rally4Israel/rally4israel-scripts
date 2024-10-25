const { RawEventsToUTCSyncer } = require("../../syncers")
const { MockCalendarAPI, MockSheetAPI } = require("../mockers")


describe('Creating new event', () => {
    function createNewEvent() {
        let israelChantsCalendarAPI = new MockCalendarAPI(initialEvents = [
            {
                id: 1,
                creator: { email: 'creator@email.com' },
                summary: "Test Event",
                start: { date: '2015-05-28' },
                end: { date: '2015-05-28' },
            }
        ])
        let utcCalendarAPI = new MockCalendarAPI()
        let eventIDMapSheetAPI = new MockSheetAPI(initialData = [["Raw Event ID", "UTC Event ID"]])
        let usersSheetAPI = new MockSheetAPI(initialData = [
            ["Email", "Is Approved"],
            ["creator@email.com", "TRUE"]
        ])
        let sycner = new RawEventsToUTCSyncer(
            [israelChantsCalendarAPI],
            utcCalendarAPI,
            eventIDMapSheetAPI,
            usersSheetAPI
        )
        sycner.sync()

        return {
            israelChantsCalendarAPI,
            utcCalendarAPI,
            eventIDMapSheetAPI,
            usersSheetAPI
        }
    }

    test('Syncs new to UTC calendar if user is approved', () => {
        const { utcCalendarAPI } = createNewEvent()
        utcEvents = utcCalendarAPI.getAllEvents()
        expect(utcEvents.length).toStrictEqual(1)
        expect(utcEvents[0].summary).toStrictEqual("Test Event")
    })

    test('Adds event id mapping to sheet', () => {
        const { israelChantsCalendarAPI, utcCalendarAPI, eventIDMapSheetAPI } = createNewEvent()

        rawEvent = israelChantsCalendarAPI.getAllEvents()[0]
        utcEvent = utcCalendarAPI.getAllEvents()[0]
        expect(eventIDMapSheetAPI.getAllData().length).toStrictEqual(1)
        expect(eventIDMapSheetAPI.getAllData()[0]).toStrictEqual([rawEvent.id, utcEvent.id])
    })
})