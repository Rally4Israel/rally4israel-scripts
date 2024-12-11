const { MockCalendarAPI } = require("../../../mockers")

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

test('getEventById gets an event by id', () => {
    const calendarAPI = new MockCalendarAPI(initialEvents = [
        {
            id: 1,
            iCalUID: '1@google.com',
            summary: 'Summary 1'
        },
        {
            id: 2,
            iCalUID: '2@google.com',
            summary: 'Summary 2'
        }
    ])
    let event = calendarAPI.getEventById(1)
    expect(event.id).toStrictEqual(1)
})

test('getEventsInRange Filters events based on a date range', () => {
    const mockAPI = new MockCalendarAPI([
        { id: "1", start: { date: '2023-12-01' }, end: { date: '2023-12-02' } },
        { id: "2", start: { date: '2024-06-01' }, end: { date: '2024-06-02' } },
        { id: "3", start: { date: '2025-01-01' }, end: { date: '2025-01-02' } },
    ]);

    const fromDate = '2024-01-01T00:00:00.000Z';
    const toDate = '2024-12-31T23:59:59.999Z';

    const filteredEvents = mockAPI.getEventsInRange(fromDate, toDate);
    const eventIDs = filteredEvents.map(event => event.id);

    expect(eventIDs).toContain("2");
    expect(eventIDs).not.toContain("1");
    expect(eventIDs).not.toContain("3");
});