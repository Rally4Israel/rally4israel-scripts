class CalendarAPI {
    constructor(calendarId) {
        this.calendarId = calendarId;
    }

    getAllEvents() {
        let events = [];
        let pageToken;

        do {
            let response = Calendar.Events.list(this.calendarId, {
                pageToken: pageToken,
                maxResults: 2500,
                showDeleted: false,
            });
            if (response.items && response.items.length > 0) {
                events = events.concat(response.items);
            }
            pageToken = response.nextPageToken;
        } while (pageToken);

        return events;
    }

    createEvent(eventData) {
        try {
            let createdEvent = Calendar.Events.insert(eventData, this.calendarId);
            Logger.log('Event created: ' + createdEvent.htmlLink);
            return createdEvent;
        } catch (error) {
            Logger.log('Error creating event: ' + error.message);
        }
    }

    updateEvent(eventId, eventOptions) {
        try {
            let updatedEvent = Calendar.Events.update(eventOptions, this.calendarId, eventId);
            Logger.log('Event updated: ' + updatedEvent.htmlLink);
            return updatedEvent;
        } catch (error) {
            Logger.log('Error updating event: ' + error.message);
        }
    }

    deleteEvent(eventId) {
        try {
            Calendar.Events.remove(this.calendarId, eventId);
            Logger.log('Event deleted successfully.');
        } catch (error) {
            Logger.log('Error deleting event: ' + error.message);
        }
    }
}

class EventAPI {
    static getById(id) {
        return CalendarApp.getEventById(id);
    }

    static deleteById(id) {
        return this.getById(id).deleteEvent();
    }
}

class SheetsDocAPI {
    constructor(docId) {
        this.docId = docId
        this.doc = this.getDoc()
    }

    getDoc() {
        return SpreadsheetApp.openById(this.docId);
    }
}

class SheetAPI {
    constructor(doc, sheetName) {
        this.doc = doc
        this.sheetName = sheetName
        this.sheet = this.getSheet()
        this.columnIndexMap = this.getColumnIndexMap();
    }

    getSheet() {
        return this.doc.getSheetByName(this.sheetName);
    }

    getColumnIndexMap() {
        let columnIndexMap = {}
        let data = this.sheet.getDataRange().getValues();
        let header = data[0]
        for (let i = 0; i < header.length; i++) {
            columnIndexMap[header[i]] = i;
        }
        return columnIndexMap
    }

    getColIdx(columnName) {
        return this.columnIndexMap[columnName]
    }

    getAllData() {
        return this.sheet.getDataRange().getValues();
    }

    getAllRecords() {
        let data = this.getAllData();
        return data.slice(1)
    }

    deleteRowBySheetIdx(index) {
        this.sheet.deleteRow(index + 1) // row positions are 1-indexed
    }

    deleteByRowNumber(rowNumber) {
        let rowIndex = rowNumber - 1
        this.deleteRowBySheetIdx(rowIndex)
    }

    appendRow(data) {
        this.getSheet().appendRow(data);
    }
}