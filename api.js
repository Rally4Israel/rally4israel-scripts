class CalendarAPI {
    constructor(calendarId) {
        this.calendarId = calendarId;
        this.calendar = this.getCalendar()
        this.createEvent = this.calendar.createEvent
    }

    getCalendar() {
        return CalendarApp.getCalendarById(this.calendarId);
    }

    getAllEvents() {
        let beginningOfTime = new Date(0);
        let endOfTime = new Date(9999, 11, 31);
        return this.calendar.getEvents(beginningOfTime, endOfTime);
    }

    deleteEventById(id) {
        return this.getEventById(id).deleteEvent();
    }

    getEventById(id) {
        return this.calendar.getEventById(id);
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
        let data = this.sheet.getDataRange().getValues();
        return data.slice(1)
    }

    deleteRowByIndex(index) {
        this.sheet.deleteRow(index + 1) // row positions are 1-indexed
    }

    appendRow(data) {
        this.getSheet().appendRow(data);
    }
}