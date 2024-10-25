const { RawEventsToUTCSyncer } = require("../../syncers")
const { MockCalendarAPI, MockSheetAPI } = require("../mockers")


describe('Creating new event', () => {
    function createNewEvent(options = {}) {
        let israelChantsCalendarAPI = new MockCalendarAPI(initialEvents = options.initialRawEvents || [
            {
                id: 1,
                creator: { email: options.creator || 'approved@email.com' },
                summary: "Test Event",
                start: { date: '2015-05-28' },
                end: { date: '2015-05-28' },
            }
        ])
        let utcCalendarAPI = new MockCalendarAPI()
        let eventIDMapSheetAPI = new MockSheetAPI(initialData = [["Raw Event ID", "UTC Event ID"]])
        let usersSheetAPI = new MockSheetAPI(initialData = [
            ["Email", "Is Approved"],
            ["approved@email.com", "TRUE"],
            ["unapproved@email.com", "FALSE"],
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

    test('Does not sync event if user is unapproved', () => {
        const { utcCalendarAPI, eventIDMapSheetAPI } = createNewEvent({ creator: "unapproved@email.com" })

        expect(eventIDMapSheetAPI.getAllData().length).toStrictEqual(0)
        expect(utcCalendarAPI.getAllEvents().length).toStrictEqual(0)
    })

    test('Adds new users to user map', () => {
        const { utcCalendarAPI, eventIDMapSheetAPI, usersSheetAPI } = createNewEvent({ creator: "newUser@email.com" })

        expect(eventIDMapSheetAPI.getAllData().length).toStrictEqual(0)
        expect(utcCalendarAPI.getAllEvents().length).toStrictEqual(0)
        let userEmailColIdx = usersSheetAPI.getColIdx('Email')
        let userApprovedColIdx = usersSheetAPI.getColIdx('Is Approved')
        let newUserRow = usersSheetAPI.getAllData().find(row => row[userEmailColIdx] === "newUser@email.com")
        expect(newUserRow[userApprovedColIdx]).toStrictEqual("FALSE")
    })

    test('Does not duplicate new users', () => {
        const newUserEmail = 'newUser@email.com'
        const eventTemplate = {
            creator: { email: newUserEmail },
            summary: "Test Event",
            start: { date: '2015-05-28' },
            end: { date: '2015-05-28' },
        }
        const { usersSheetAPI } = createNewEvent({
            initialRawEvents: [{ ...eventTemplate, id: 1 }, { ...eventTemplate, id: 2 }]
        })

        let userEmailColIdx = usersSheetAPI.getColIdx('Email')
        let newUserRows = usersSheetAPI.getAllData().filter(row => row[userEmailColIdx] === newUserEmail)
        expect(newUserRows.length).toStrictEqual(1)
    })
})