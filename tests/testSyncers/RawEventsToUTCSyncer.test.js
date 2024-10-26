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

describe('Updating old event', () => {
    test('Updates old event', () => {
        const eventTemplate = {
            creator: { email: "approved@email.com" },
            start: { date: '2015-05-28' },
            end: { date: '2015-05-28' },
        }
        let israelChantsCalendarAPI = new MockCalendarAPI(initialEvents = [
            { ...eventTemplate, id: "1", summary: "Updated Event" }
        ])
        let utcCalendarAPI = new MockCalendarAPI(initialEvents = [
            { ...eventTemplate, id: "2", summary: "Original Event" }
        ])
        let eventIDMapSheetAPI = new MockSheetAPI(initialData = [
            ["Raw Event ID", "UTC Event ID"],
            ["1", "2"]
        ])
        let usersSheetAPI = new MockSheetAPI(initialData = [
            ["Email", "Is Approved"],
            ["approved@email.com", "TRUE"],
        ])
        let sycner = new RawEventsToUTCSyncer(
            [israelChantsCalendarAPI],
            utcCalendarAPI,
            eventIDMapSheetAPI,
            usersSheetAPI
        )
        sycner.sync()

        let utcEvent = utcCalendarAPI.getAllEvents()[0]
        expect(utcEvent.summary).toStrictEqual("Updated Event")
    })
})


describe('Deleting events', () => {
    test('UTC event gets deleted if raw event is deleted', () => {

        const eventTemplate = {
            creator: { email: "approved@email.com" },
            start: { date: '2015-05-28' },
            end: { date: '2015-05-28' },
        }
        let israelChantsCalendarAPI = new MockCalendarAPI(initialEvents = [
            { ...eventTemplate, id: "1", summary: "Current Event" }
        ])
        let utcCalendarAPI = new MockCalendarAPI(initialEvents = [
            { ...eventTemplate, id: "2", summary: "Current Event" },
            { ...eventTemplate, id: "4", summary: "Old Event" }
        ])
        let eventIDMapSheetAPI = new MockSheetAPI(initialData = [
            ["Raw Event ID", "UTC Event ID"],
            ["1", "2"],
            ["3", "4"]
        ])
        let usersSheetAPI = new MockSheetAPI(initialData = [
            ["Email", "Is Approved"],
            ["approved@email.com", "TRUE"],
        ])
        let sycner = new RawEventsToUTCSyncer(
            [israelChantsCalendarAPI],
            utcCalendarAPI,
            eventIDMapSheetAPI,
            usersSheetAPI
        )
        sycner.sync()

        let utcEvents = utcCalendarAPI.getAllEvents()
        expect(utcEvents.length).toBe(1)
        expect(utcEvents[0].summary).toBe("Current Event")
        let eventIdMappings = eventIDMapSheetAPI.getAllData()
        expect(eventIdMappings.length).toBe(1)
        expect(eventIdMappings[0]).toStrictEqual(["1", "2"])
    })
    test('Can delete multiple events', () => {

        const eventTemplate = {
            creator: { email: "approved@email.com" },
            start: { date: '2015-05-28' },
            end: { date: '2015-05-28' },
        }
        let israelChantsCalendarAPI = new MockCalendarAPI(initialEvents = [
            { ...eventTemplate, id: "1", summary: "Current Event" }
        ])
        let utcCalendarAPI = new MockCalendarAPI(initialEvents = [
            { ...eventTemplate, id: "2", summary: "Current Event" },
            { ...eventTemplate, id: "4", summary: "Old Event" },
            { ...eventTemplate, id: "6", summary: "Old Event 2" }
        ])
        let eventIDMapSheetAPI = new MockSheetAPI(initialData = [
            ["Raw Event ID", "UTC Event ID"],
            ["1", "2"],
            ["3", "4"],
            ["5", "6"],
        ])
        let usersSheetAPI = new MockSheetAPI(initialData = [
            ["Email", "Is Approved"],
            ["approved@email.com", "TRUE"],
        ])
        let sycner = new RawEventsToUTCSyncer(
            [israelChantsCalendarAPI],
            utcCalendarAPI,
            eventIDMapSheetAPI,
            usersSheetAPI
        )
        sycner.sync()

        let utcEvents = utcCalendarAPI.getAllEvents()
        expect(utcEvents.length).toBe(1)
        expect(utcEvents[0].summary).toBe("Current Event")
        let eventIdMappings = eventIDMapSheetAPI.getAllData()
        expect(eventIdMappings.length).toBe(1)
        expect(eventIdMappings[0]).toStrictEqual(["1", "2"])
    })
})

describe('Previously approved user with events gets un-approved', () => {
    test('UTC event gets deleted', () => {
        const eventTemplate = {
            creator: { email: "unapproved@email.com" },
            start: { date: '2015-05-28' },
            end: { date: '2015-05-28' },
        }
        let israelChantsCalendarAPI = new MockCalendarAPI(initialEvents = [
            { ...eventTemplate, id: "1", summary: "Current Event" }
        ])
        let utcCalendarAPI = new MockCalendarAPI(initialEvents = [
            { ...eventTemplate, id: "2", summary: "Current Event" },
        ])
        let eventIDMapSheetAPI = new MockSheetAPI(initialData = [
            ["Raw Event ID", "UTC Event ID"],
            ["1", "2"],
        ])
        let usersSheetAPI = new MockSheetAPI(initialData = [
            ["Email", "Is Approved"],
            ["approved@email.com", "TRUE"],
        ])
        let sycner = new RawEventsToUTCSyncer(
            [israelChantsCalendarAPI],
            utcCalendarAPI,
            eventIDMapSheetAPI,
            usersSheetAPI
        )
        sycner.sync()

        let utcEvents = utcCalendarAPI.getAllEvents()
        expect(utcEvents.length).toBe(0)
        let eventIdMappings = eventIDMapSheetAPI.getAllData()
        expect(eventIdMappings.length).toBe(0)
    })
})
