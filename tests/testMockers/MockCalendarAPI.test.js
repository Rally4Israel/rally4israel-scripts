const { MockCalendarAPI } = require("../mockers")

test('has no initial events by default', () => {
    const calendarAPI = new MockCalendarAPI()
    const events = calendarAPI.getAllEvents()
    expect(events).toStrictEqual([])
})

test('getAllEvents returns list of events', () => {
    const calendarAPI = new MockCalendarAPI(initialEvents = [{ id: 1 }, { id: 2 }])
    const events = calendarAPI.getAllEvents()
    expect(events.length).toStrictEqual(2)
    const ids = events.map(e => e.id)
    expect(ids.includes(1)).toBe(true)
    expect(ids.includes(2)).toBe(true)
})

test('createEvent adds an event to the calendar', () => {
    const calendarAPI = new MockCalendarAPI()
    calendarAPI.createEvent({ summary: 'Test Event' })
    const events = calendarAPI.getAllEvents()
    expect(events.length).toStrictEqual(1)
    expect(events[0].summary).toStrictEqual('Test Event')
})

test('updateEvent updates an event by iCalUID', () => {
    const calendarAPI = new MockCalendarAPI(initialEvents = [
        {
            id: 1,
            iCalUID: '1@google.com',
            summary: 'Original Summary 1'
        },
        {
            id: 2,
            iCalUID: '2@google.com',
            summary: 'Original Summary 2'
        }
    ])
    calendarAPI.updateEvent(1, { summary: "New Summary 1" })
    let events = calendarAPI.getAllEvents()
    let event1 = events.find(e => e.id === 1)
    let event2 = events.find(e => e.id === 2)
    expect(event1.summary).toStrictEqual("New Summary 1")
    expect(event2.summary).toStrictEqual("Original Summary 2")
})

test('deleteEvent deletes an event', () => {
    const calendarAPI = new MockCalendarAPI(initialEvents = [
        {
            id: 1,
            iCalUID: '1@google.com',
            summary: 'Original Summary 1'
        },
        {
            id: 2,
            iCalUID: '2@google.com',
            summary: 'Original Summary 2'
        }
    ])
    calendarAPI.deleteEvent(1)
    let events = calendarAPI.getAllEvents()
    expect(events.length).toStrictEqual(1)
    expect(events[0].id).toStrictEqual(2)
})