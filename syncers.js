class CalendarToSheetSyncer {
    constructor(calendar, sheet, startTime, endTime) {
        this.calendar = calendar
        this.sheet = sheet
        this.startTime = startTime
        this.endTime = endTime
        this.spreadSheet = this.sheet
    }

    sync() {
        console.log("Syncing raw events to sheet...")
        this.resetSpreadSheet()
        let events = this.getAllCalendarEvents()
        this.syncSpreadSheet(events)
    }

    getAllCalendarEvents() {
        let events = this.calendar.getEvents(this.startTime, this.endTime);
        console.log(`${events.length} event(s) retrieved`)
        return events
    }

    resetSpreadSheet() {
        // Clear any existing content in the sheet
        this.sheet.clear();

        // Set headers in the first row
        this.sheet.appendRow(['iCalUID', 'Event Title', 'Start Time (Local)', 'End Time (Local)', 'Start Time (GMT)', 'End Time (GMT)', 'Location', 'Description', 'Is All Day', 'Creator']);
    }

    syncSpreadSheet(events) {
        // Loop through the events and save details in the sheet
        for (let i = 0; i < events.length; i++) {
            // CalenarEvent api: https://developers.google.com/apps-script/reference/calendar/calendar-event
            let event = events[i];
            console.log(`importing event: ${event.getTitle()}`)
            let title = event.getTitle();
            let startTimeLocal = new Date(event.getStartTime());
            let endTimeLocal = new Date(event.getEndTime());
            let startTimeGMT = startTimeLocal.toUTCString();
            let endTimeGMT = endTimeLocal.toUTCString();
            let location = event.getLocation() || ''; // Get location if available
            let description = event.getDescription() || ''; // Get description if available
            let isAllDayEvent = event.isAllDayEvent()
            let creator = event.getCreators()[0]
            let uid = event.getId()

            // Append each event's data as a new row in the sheet
            this.sheet.appendRow([uid, title, startTimeLocal, endTimeLocal, startTimeGMT, endTimeGMT, location, description, isAllDayEvent, creator]);
        }
    }
}

class UTCCalendarSyncer {
    constructor(calendar, sheet) {
        this.calendar = calendar
        this.sheet = sheet
        this.columnIndexMap = {};
    }

    sync() {
        let data = this.sheet.getDataRange().getValues();
        this.mapColumnIndexes(data[0]);
        // Loop through the rows starting from row 2 (index 1)
        console.log(`Syncing ${data.length - 1} events to UTC calendar...`)
        for (let i = 1; i < data.length; i++) {
            let row = data[i];
            if (!row[1]) break
            this.syncRow(i, row)
        }
        this.deleteOldEvents()
    }

    mapColumnIndexes(headerRow) {
        for (let i = 0; i < headerRow.length; i++) {
            this.columnIndexMap[headerRow[i]] = i;
        }
    }

    syncRow(rowIndex, row) {
        console.log(`Syncing row: ${row[0]}`)
        let utcEventId = row[this.columnIndexMap["UTC'd UID"]];
        let title = row[this.columnIndexMap["Event Title"]];
        let localStartTime = new Date(row[this.columnIndexMap["Start Time (Local)"]]);
        let localEndTime = new Date(row[this.columnIndexMap["End Time (Local)"]]);
        let location = row[this.columnIndexMap["Location"]];
        let description = row[this.columnIndexMap["Description"]];
        let isAllDay = row[this.columnIndexMap["Is All Day"]];

        let event = this.calendar.getEventById(utcEventId)


        if (event) {
            console.log(`Updating UTC event: ${event.getTitle()}`)
            event.setTitle(title)
            if (isAllDay) {
                event.setAllDayDate(localStartTime.date)
            } else {
                event.setTime(localStartTime, localEndTime)
            }
            event.setDescription(description)
            event.setLocation(location)
            event.setLocation(location)
        } else {
            console.log(`Creating UTC event: ${event.getTitle()}`)
            event = this.calendar.createEvent(
                title,
                localStartTime,
                localEndTime,
                {
                    description: description || '',
                    location: location || '',
                    allDay: isAllDay || false
                }
            );
        }
        let utcUIDColumnIndex = this.columnIndexMap["UTC'd UID"];
        this.sheet.getRange(rowIndex + 1, utcUIDColumnIndex + 1).setValue(event.getId()); // Adjust for 1-based index
    }

    deleteOldUTCIds() {
        let data = this.sheet.getDataRange().getValues();
        let iCalUIDColumnIndex = this.columnIndexMap["iCalUID"];
        let utcUIDColumnIndex = this.columnIndexMap["UTC'd UID"];

        // Iterate through each row (skip the header row at index 0)
        for (let i = data.length - 1; i > 0; i--) { // Loop backward to avoid index shifting issues when deleting
            let row = data[i];

            // If the iCalUID field is empty, delete the row
            if (!row[iCalUIDColumnIndex] && row[utcUIDColumnIndex]) {
                console.log(`Clearing UTC'd UID cell in row ${i + 1}`);
                this.sheet.getRange(i + 1, utcUIDColumnIndex + 1).clearContent(); // Adjust for 1-based index
            }
        }

        console.log("Old UTC IDs deleted.");
    }

    deleteOldEvents() {
        console.log("Deleting old events...")
        /*
          - Get all events from UTC calendar
          - Get all ids from sheet
          - Delete anything from calendar that's not on sheet
        */
        this.deleteOldUTCIds()
        // Get all events from the UTC calendar from the beginning of time to the end of time
        let beginningOfTime = new Date(0); // January 1, 1970
        let endOfTime = new Date(9999, 11, 31); // December 31, 9999
        let events = this.calendar.getEvents(beginningOfTime, endOfTime);

        // Get all event IDs from the sheet
        let sheetData = this.sheet.getDataRange().getValues();
        let sheetEventIds = new Set();

        for (let i = 1; i < sheetData.length; i++) { // Start from 1 to skip headers
            let eventId = sheetData[i][this.columnIndexMap["UTC'd UID"]];
            if (eventId) {
                sheetEventIds.add(eventId); // Add event ID to the set
            }
        }
        // Loop through the calendar events and delete those not in the sheet
        for (let event of events) {
            let eventId = event.getId();

            if (!sheetEventIds.has(eventId)) {
                console.log(`Deleting event with ID: ${eventId}`);
                event.deleteEvent(); // Delete the event from the calendar
            }
        }
    }
}

if (typeof module !== 'undefined') {
    module.exports = {
        SheetCalendarSyncer,
        CalendarToSheetSyncer,
        UTCCalendarSyncer
    };
}