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

class MockAirtableAPI {
    constructor(data, upsertFieldsToMergeOn) {
        this.data = data || []
        this.upsertFieldsToMergeOn = upsertFieldsToMergeOn

        /*
        Example Data:
        [{
            id: 'recPxwDejU7lzhIU6',
            createdTime: '2024-10-27T20:00:51.000Z',
            fields:
            {
                Title: 'Event Three',
                End: '2024-10-29T03:00:00.000Z',
                'Event ID': '3',
                Start: '2024-10-28T22:00:00.000Z',
                'Event Name': 'Event Three'
            }
        }]
        */
    }

    getAllRecords() {
        return this.data
    }

    createRecords(records) {
        records.forEach(record => this.createRecord(record))
    }

    createRecord(record) {
        let id = uuidv4();
        let createdTime = new Date()
        let newRecord = { id: id, createdTime: createdTime, ...record }
        this.data.push(newRecord)
        return newRecord
    }

    upsertRecords(records) {
        return records.map(record => this.upsertRecord(record))
    }

    upsertRecord(record) {
        let oldRecords = this.data.filter(oldRecord =>
            this.upsertFieldsToMergeOn.every(field =>
                oldRecord.fields[field] === record.fields[field]
            )
        )

        if (oldRecords.length > 1) {
            throw new Error("Upsert Error: Multiple matching records found")
        } else if (oldRecords.length === 1) {
            let oldRecord = oldRecords[0]
            return this.updateRecord(oldRecord, record)
        } else {
            return this.createRecord(record)
        }
    }

    updateRecord(oldRecord, newRecordData) {
        oldRecord.fields = { ...oldRecord.fields, ...newRecordData.fields }
        return oldRecord
    }

    deleteRecords(recordIds) {
        let recordIdObj = {}
        recordIds.forEach(id => recordIdObj[id] = true)
        for (let index = this.data.length - 1; index >= 0; index--) {
            let record = this.data[index];
            let id = record.id
            if (id in recordIdObj) {
                this.data.splice(index, 1)
            }
        }
    }
}

module.exports = { MockSheetAPI, MockCalendarAPI, MockAirtableAPI };
