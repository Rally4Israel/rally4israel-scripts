const { GCalToAirtableSyncer } = require("../../syncers")
const { MockCalendarAPI, MockAirtableAPI } = require("../../mockers")

function getAirtableEventsAPI(initialRecords = []) {
    return new MockAirtableAPI(initialRecords, ["GCalID"])
}

function getAirtableUsersAPI(initialRecords = []) {
    return new MockAirtableAPI(initialRecords, ["Email"])
}

function getGCalAPI(initialEvents = []) {
    return new MockCalendarAPI(initialEvents)
}

const sourceEventTemplate = {
    id: 1,
    creator: { email: "user@email.com" },
    summary: "Test Event",
    start: { date: '2015-05-28' },
    end: { date: '2015-05-28' },
}

describe('Creating new event', () => {

    function createEvent(initialSourceEvents) {
        let sourceGCalAPI = getGCalAPI(initialSourceEvents || [sourceEventTemplate])
        let airtableEventsAPI = getAirtableEventsAPI()
        let airtableUsersAPI = getAirtableUsersAPI()
        let sycner = new GCalToAirtableSyncer(
            [sourceGCalAPI],
            airtableEventsAPI,
            airtableUsersAPI
        )
        sycner.sync()
        return { airtableEventsAPI, airtableUsersAPI }
    }
    test('Syncs event to airtable', () => {
        const { airtableEventsAPI } = createEvent([{
            id: "1",
            creator: { email: "user@email.com" },
            summary: "Test Event",
            description: "Some description",
            location: "Somewhere over the rainbow",
            start: { date: '2015-05-28' },
            end: { date: '2015-05-28' },
            recurringEventId: "recurring-event-id-2"
        }])

        let airtableEvents = airtableEventsAPI.getAllRecords()
        expect(airtableEvents.length).toStrictEqual(1)
        let fields = airtableEvents[0].fields
        expect(fields.GCalID).toStrictEqual("1")
        expect(fields.Title).toStrictEqual("Test Event")
        expect(fields.Location).toStrictEqual("Somewhere over the rainbow")
        expect(fields["All Day"]).toStrictEqual(true)
        expect(fields.Description).toStrictEqual("Some description")
        expect(fields["Recurring Event"]).toStrictEqual(true)
        expect(fields["Recurring Event ID"]).toStrictEqual('recurring-event-id-2')
    })

    test('Adds new users to user table', () => {
        let creatorEmail = "creator@email.com"
        const { airtableUsersAPI } = createEvent([{ ...sourceEventTemplate, creator: { email: creatorEmail } }])

        let airtableUsers = airtableUsersAPI.getAllRecords()
        expect(airtableUsers.length).toStrictEqual(1)
        expect(airtableUsers[0].fields.Email).toStrictEqual(creatorEmail)
    })

    test('Adds new user id to event record', () => {
        const { airtableUsersAPI, airtableEventsAPI } = createEvent()

        let user = airtableUsersAPI.getAllRecords()[0]
        let event = airtableEventsAPI.getAllRecords()[0]
        expect(event.fields.Creator).toStrictEqual([user.id])
    })

    test('Converts times to UTC', () => {
        const sourceEvent = {
            creator: { email: "user@email.om" },
            start: {
                timeZone: 'Pacific/Pitcairn',
                dateTime: '2024-10-15T04:45:00+03:00'
            },
            iCalUID: '7ri4a4ppklpfehfh3i80av3k1g@google.com',
            end: {
                timeZone: 'Pacific/Pitcairn',
                dateTime: '2024-10-15T05:45:00+03:00'
            },
            id: '7ri4a4ppklpfehfh3i80av3k1g',
        }
        const { airtableEventsAPI } = createEvent([sourceEvent])

        const airtableEventFields = airtableEventsAPI.getAllRecords()[0].fields
        expect(airtableEventFields.Start).toStrictEqual("2024-10-14T17:45:00.000Z")
        expect(airtableEventFields.End).toStrictEqual("2024-10-14T18:45:00.000Z")
    })
})

describe('Updating old event', () => {
    test('Updates old event', () => {
        let airtableUsersAPI = getAirtableUsersAPI([{
            id: "old-user-id",
            fields: {
                Email: "old@email.com",
                IsApproved: true
            }
        },
        {
            id: "new-user-id",
            fields: {
                Email: "new@email.com",
                IsApproved: true
            }
        }])
        let sourceGCalAPI = getGCalAPI([{
            id: "1",
            creator: { email: "new@email.com" },
            start: { date: '2015-05-28' },
            end: { date: '2015-05-28' },
            summary: "New Title"
        }])
        let airtableEventsAPI = getAirtableEventsAPI([{
            id: "2",
            fields: {
                Title: "Old Title",
                Creator: ["old-user-id"],
                GCalID: "1"
            }
        }])

        let sycner = new GCalToAirtableSyncer(
            [sourceGCalAPI],
            airtableEventsAPI,
            airtableUsersAPI
        )
        sycner.sync()

        let airtableEvent = airtableEventsAPI.getAllRecords()[0]
        expect(airtableEvent.fields.Creator).toStrictEqual(["new-user-id"])
        expect(airtableEvent.fields.Title).toStrictEqual("New Title")
    })
})


describe('Deleting events', () => {
    test('Deletes Airtable records if GCal Event is deleted', () => {
        let sourceGCalAPI = new MockCalendarAPI([
            {
                id: "2",
                creator: { email: "user@email.com" },
                summary: "Test Event",
                start: { date: '2015-05-28' },
                end: { date: '2015-05-28' },
            }
        ])
        let airtableEventsAPI = getAirtableEventsAPI([
            { id: "1", fields: { GCalID: "1" } },
            { id: "2", fields: { GCalID: "2" } },
            { id: "3", fields: { GCalID: "3" } },
        ])
        let sycner = new GCalToAirtableSyncer(
            [sourceGCalAPI],
            airtableEventsAPI,
            getAirtableUsersAPI()
        )
        sycner.sync()

        let airtableEvents = airtableEventsAPI.getAllRecords()
        expect(airtableEvents.length).toStrictEqual(1)
        expect(airtableEvents[0].fields.GCalID).toStrictEqual("2")
    })
})
