class CalendarAPI {
    constructor(calendarId) {
        this.calendarId = calendarId;
        this.calendar = this.getCalendar()
    }

    getCalendar() {
        return CalendarApp.getCalendarById(this.calendarId);
    }
}

class SheetAPI {
    constructor(docId, sheetName) {
        this.docId = docId
        this.sheetName = sheetName
        this.sheet = this.getSheet()
    }

    getSheet() {
        let doc = SpreadsheetApp.openById(this.docId);
        return doc.getSheetByName(this.sheetName);
    }
}