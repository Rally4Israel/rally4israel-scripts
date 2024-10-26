const { v4: uuidv4 } = require('uuid');

class MockSheetAPI {
    constructor(initialData = null) {
        this.sheetData = []
        if (initialData) {
            this.sheetData = this.sheetData.concat(initialData)
        }
    }

    getAllData() {
        return this.sheetData.slice(1)
    }

    appendRow(rowData) {
        this.sheetData.push(rowData)
    }

    getColumnIndexMap() {
        let columnIndexMap = {}
        let header = this.sheetData[0];
        for (let i = 0; i < header.length; i++) {
            columnIndexMap[header[i]] = i;
        }
        return columnIndexMap
    }

    getColIdx(columnName) {
        return this.getColumnIndexMap()[columnName]
    }

    deleteAllRowsByColumnValue(columnName, value) {
        let colIdx = this.getColIdx(columnName)
        for (let index = this.sheetData.length - 1; index >= 1; index--) {
            let isMatch = this.sheetData[index][colIdx] === value
            if (isMatch) {
                this.deleteRowBySheetIdx(index)
            }
        }
    }

    deleteRowBySheetIdx(sheetIdx) {
        this.sheetData.splice(sheetIdx, 1)
    }

    deleteByRowNumber(rowNumber) {
        let rowIndex = rowNumber - 1
        this.sheetData.splice(rowIndex, 1)
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
