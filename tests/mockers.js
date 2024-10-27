const { v4: uuidv4 } = require('uuid');

class MockSheetAPI {
    constructor(initialData = null) {
        this.sheetData = []
        if (initialData) {
            this.sheetData = this.sheetData.concat(initialData)
        }
    }

    getAllData() {
        return this.sheetData
    }

    getAllRecords() {
        return this.getAllData().slice(1)
    }

    appendRow(rowData) {
        this.sheetData.push(rowData)
    }

    getColumnIndexMap() {
        let columnIndexMap = {}
        let header = this.getAllData()[0];
        for (let i = 0; i < header.length; i++) {
            columnIndexMap[header[i]] = i;
        }
        return columnIndexMap
    }

    getColIdx(columnName) {
        return this.getColumnIndexMap()[columnName]
    }

    deleteRowBySheetIdx(sheetIdx) {
        this.sheetData.splice(sheetIdx, 1)
    }

    deleteByRowNumber(rowNumber) {
        let rowIndex = rowNumber - 1
        this.deleteRowBySheetIdx(rowIndex)
    }
}

class MockCalendarAPI {
    constructor(initialEvents = []) {
        this.events = this.eventsListToObject(initialEvents)
    }

    eventsListToObject(events) {
        const eventsObject = {}
        events.forEach(event => {
            eventsObject[event.id] = event
        })
        return eventsObject
    }

    getAllEvents() {
        return Object.values(this.events)
    }

    createEvent(event) {
        let uuid = uuidv4();
        let copiedEvent = structuredClone(event);
        copiedEvent.id = uuid
        copiedEvent.iCalUID = `${uuid}@google.com`
        this.events[uuid] = copiedEvent
        return this.events[uuid]
    }

    updateEvent(eventId, eventOptions) {
        let oldEvent = this.events[eventId]
        let copiedIncomingData = structuredClone(eventOptions);
        copiedIncomingData.id = oldEvent.id
        copiedIncomingData.iCalUID = `${oldEvent.iCalUID}@google.com`
        this.events[eventId] = copiedIncomingData
        return this.events[eventId]
    }

    deleteEvent(eventId) {
        delete this.events[eventId]
    }

    getEventById(eventId) {
        return this.events[eventId]
    }
}

module.exports = { MockSheetAPI, MockCalendarAPI };
