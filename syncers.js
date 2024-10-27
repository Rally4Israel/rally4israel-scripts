const eventSourceType = {
    utc: "utc",
    raw: "raw"
}

class RawEventsToUTCSyncer {
    constructor(sourceCalendars, utcCalendar, eventIdMapSheet, usersSheet) {
        this.sourceCalendars = sourceCalendars
        this.utcCalendar = utcCalendar
        this.eventIdMapSheet = eventIdMapSheet
        this.usersSheet = usersSheet
        this.usersMap = {}
        this.syncedEventsIdMap = {}
        this.incomingUTCEventIds = {}
    }

    sync() {
        this.buildUsersMap()
        this.buildSyncedEventsMap()
        this.processIncomingEvents()
        this.deleteStaleEvents()
    }

    buildUsersMap() {
        let userRecords = this.usersSheet.getAllRecords()
        let emailColIdx = this.usersSheet.getColIdx('Email')
        let isApprovedColIdx = this.usersSheet.getColIdx('Is Approved')
        userRecords.forEach(userRecord => {
            let email = userRecord[emailColIdx]
            if (!email) return
            let isApproved = userRecord[isApprovedColIdx]
            this.usersMap[email] = { isApproved: isApproved }
        })
    }

    buildSyncedEventsMap() {
        let rawEventIdColIdx = this.eventIdMapSheet.getColIdx('Raw Event ID')
        let utcEventIdColIdx = this.eventIdMapSheet.getColIdx('UTC Event ID')
        let idMappings = this.eventIdMapSheet.getAllRecords()
        for (let i = 0; i < idMappings.length; i++) {
            const idMapping = idMappings[i];
            let rawEventId = idMapping[rawEventIdColIdx]
            let utcEventId = idMapping[utcEventIdColIdx]
            this.addSyncedEventToMap(rawEventId, utcEventId, i + 2)
        }
    }

    processIncomingEvents() {
        this.sourceCalendars.forEach(calendar => {
            calendar.getAllEvents().forEach(event => {
                this.processIncomingEvent(event)
            })
        })
    }

    processIncomingEvent(event) {
        let creatorEmail = event.creator.email
        if (!this.usersMap[creatorEmail]) {
            this.addNewUser(creatorEmail)
        } else if (this.usersMap[creatorEmail].isApproved) {
            this.createOrUpdateUTCEvent(event)
        }
    }

    createOrUpdateUTCEvent(rawEvent) {
        let utcEvent;
        let syncedEventData = this.getSyncedEventData(eventSourceType.raw, rawEvent.id)
        if (syncedEventData) {
            utcEvent = this.updateUTCEvent(rawEvent);
        } else {
            utcEvent = this.createUTCEvent(rawEvent);
            this.addEventMapping(rawEvent.id, utcEvent.id);
        }
        this.incomingUTCEventIds[utcEvent.id] = true
    }

    updateUTCEvent(rawEvent) {
        this.convertEventTimesToUTC(rawEvent)
        let utcIdEventId = this.getSyncedEventData(eventSourceType.raw, rawEvent.id).utcEventId
        return this.utcCalendar.updateEvent(utcIdEventId, rawEvent)
    }

    createUTCEvent(rawEvent) {
        this.convertEventTimesToUTC(rawEvent)
        return this.utcCalendar.createEvent(rawEvent)
    }

    convertEventTimesToUTC(event) {
        this.convertEventTimeToUTC(event, "start")
        this.convertEventTimeToUTC(event, "end")
    }

    convertEventTimeToUTC(event, startOrEnd) {
        if (event[startOrEnd].timeZone) {
            event[startOrEnd] = {
                timeZone: "UTC",
                dateTime: this.toUTC(event[startOrEnd].dateTime, event[startOrEnd].timeZone)
            }
        }
    }

    toUTC(dateStr, timeZone) {
        // Replace dateTime timezone with UTC. 9AM EST becomes 9AM UTC

        // Parse dateStr to get year, month, day, hours, and minutes in the target time zone
        let date = new Date(dateStr);
        let options = { timeZone, hour12: false };

        // Retrieve date parts in the original time zone
        let year = date.toLocaleString('en-US', { ...options, year: 'numeric' });
        let month = date.toLocaleString('en-US', { ...options, month: '2-digit' });
        let day = date.toLocaleString('en-US', { ...options, day: '2-digit' });
        let hour = date.toLocaleString('en-US', { ...options, hour: '2-digit' });
        let minute = date.toLocaleString('en-US', { ...options, minute: '2-digit' });

        // Create a new Date object in UTC using the extracted parts
        return new Date(Date.UTC(
            parseInt(year),
            parseInt(month) - 1, // Months are 0-based
            parseInt(day),
            parseInt(hour),
            parseInt(minute)
        )).toISOString();
    }

    addEventMapping(rawEventId, utcEventId) {
        let result = this.addSyncedEventToSheet(rawEventId, utcEventId)
        this.addSyncedEventToMap(rawEventId, utcEventId, result.rowNumber)
    }

    addSyncedEventToSheet(rawEventId, utcEventId) {
        this.eventIdMapSheet.appendRow([rawEventId, utcEventId])
        return { rowNumber: this.eventIdMapSheet.getAllData().length + 1 }
    }

    addSyncedEventToMap(rawEventId, utcEventId, rowNumber) {
        let eventData = { rawEventId: rawEventId, utcEventId: utcEventId, rowNumber: rowNumber }
        this.syncedEventsIdMap[`${eventSourceType.raw}-${rawEventId}`] = eventData
        this.syncedEventsIdMap[`${eventSourceType.utc}-${utcEventId}`] = eventData
    }

    getSyncedEventData(eventSourceType, eventId) {
        return this.syncedEventsIdMap[`${eventSourceType}-${eventId}`]
    }

    addNewUser(email) {
        this.usersMap[email] = { isApproved: false }
        this.usersSheet.appendRow([email, false])
    }

    deleteStaleEvents() {
        let sheetRowsToDelete = []
        this.utcCalendar.getAllEvents().forEach(event => {
            if (!this.incomingUTCEventIds[event.id]) {
                this.utcCalendar.deleteEvent(event.id)
                let syncedEventData = this.getSyncedEventData(eventSourceType.utc, event.id)
                let rowNumber = syncedEventData.rowNumber
                sheetRowsToDelete.push(rowNumber)
            }
        })
        sheetRowsToDelete.sort((a, b) => b - a)
        sheetRowsToDelete.forEach(rowNumber => this.eventIdMapSheet.deleteByRowNumber(rowNumber))
    }
}


class RawEventsToUTCSyncer1 {
    constructor(sourceCalendars, utcCalendar, eventIdMapSheet, usersSheet) {
        this.sourceCalendars = sourceCalendars
        this.utcCalendar = utcCalendar
        this.eventIdMapSheet = eventIdMapSheet
        this.usersSheet = usersSheet
        this.usersMap = {}
        this.incomingRawEventsById = {}
        this.syncedEventsByRawId = {}
    }

    sync() {
        this.buildUsersMap()
        this.processIncomingEvents()
        this.buildSyncedEventsMap()
        this.createOrUpdateUTCEvents()
        this.deleteOldData()
    }

    buildUsersMap() {
        console.log("Building users map...")
        let userRecords = this.usersSheet.getAllRecords()
        let emailColIdx = this.usersSheet.getColIdx('Email')
        let isApprovedColIdx = this.usersSheet.getColIdx('Is Approved')
        for (let userRecord of userRecords) {
            if (userRecord[emailColIdx]) {
                let email = userRecord[emailColIdx]
                let isApproved = userRecord[isApprovedColIdx]
                this.usersMap[email] = { isApproved: isApproved }
            }
        }
        console.log("Finished building users maps")
    }

    addNewUser(email) {
        this.usersMap[email] = { isApproved: false }
        this.usersSheet.appendRow([email, "FALSE"])
    }

    buildSyncedEventsMap() {
        console.log('Mapping synced events...')
        let rawEventIdColIdx = this.eventIdMapSheet.getColIdx('Raw Event ID')
        let utcEventIdColIdx = this.eventIdMapSheet.getColIdx('UTC Event ID')
        let idMappings = this.eventIdMapSheet.getAllRecords()

        for (let index = 0; index < idMappings.length; index++) {
            let idMapping = idMappings[index];
            let rawEventId = idMapping[rawEventIdColIdx]
            let utcEventId = idMapping[utcEventIdColIdx]
            this.syncedEventsByRawId[rawEventId] = {
                utcEventId: utcEventId,
                rawEventId: rawEventId,
                mapSheetRowIdx: index + 1, // add 1 for header row
                rawEvent: this.incomingRawEventsById[rawEventId],
                utcEvent: this.utcCalendar.getEventById(utcEventId)
            }
        }
        console.log("Finished mapping synced events:")
    }

    processIncomingEvents() {
        console.log('Building raw events list...')
        for (let calendar of this.sourceCalendars) {
            for (let event of calendar.getAllEvents2()) {
                console.log(event)
                let creatorEmail = event.creator.email
                if (!this.usersMap[creatorEmail]) {
                    this.addNewUser(creatorEmail)
                } else if (this.usersMap[creatorEmail].isApproved) {
                    this.incomingRawEventsById[event.iCalUID] = event
                }
            }
        }
        console.log(`Raw events count: ${Object.keys(this.incomingRawEventsById).length}`)
    }

    deleteOldData() {
        this.deleteOldIdMappings()
        this.deleteOldEvents()
    }

    deleteOldIdMappings() {
        let idMappingsToDelete = []
        for (const [key, value] of Object.entries(this.syncedEventsByRawId)) {
            let rawId = key;
            if (!this.incomingRawEventsById[rawId]) {
                idMappingsToDelete.push(value)
            }
        }
        idMappingsToDelete.sort((a, b) => b.mapSheetRowIdx - a.mapSheetRowIdx);

        console.log(`Deleting ${idMappingsToDelete.length} mappings from sheet`)
        for (let idMapping of idMappingsToDelete) {

            this.deleteIdMappingFromSheet(idMapping.mapSheetRowIdx)
            delete this.syncedEventsByRawId[idMapping.rawEventId]
        }
    }

    deleteOldEvents() {
        let utcEvents = this.utcCalendar.getAllEvents()
        let utcToRawIdMap = {}
        for (const [key, value] of Object.entries(this.syncedEventsByRawId)) {
            utcToRawIdMap[value.utcEventId] = value.rawEventId
        }
        let eventsToDelete = []
        for (let utcEvent of utcEvents) {
            if (!utcToRawIdMap[utcEvent.getId()]) {
                eventsToDelete.push(utcEvent)
            }
        }
        console.log(`Deleting ${eventsToDelete.length} events...`)
        for (let event of eventsToDelete) {
            event.deleteEvent()
        }
        console.log(`Finished deleting events`)
    }

    deleteUTCEventById(id) {
        this.utcCalendar.deleteEventById(id)
    }

    deleteIdMappingFromSheet(mapSheetRowIdx) {
        console.log(`Deleting row idx ${mapSheetRowIdx} from sheet`)
        this.eventIdMapSheet.deleteRowByIndex(mapSheetRowIdx)
    }

    createOrUpdateUTCEvents() {
        console.log("Create/Updating UTC events...")
        for (const [rawId, rawEvent] of Object.entries(this.incomingRawEventsById)) {
            if (this.syncedEventsByRawId[rawId]) {
                this.updateUTCEventByRawId(rawId)
            } else {
                let utcEvent = this.createUTCEventByRawId(rawId)
                this.addEventMapping(rawEvent, utcEvent)
            }
        }
        console.log("Finished create/updating UTC events")
    }

    updateUTCEventByRawId(rawId) {
        let rawEvent = this.incomingRawEventsById[rawId]
        console.log(`Updating UTC event: ${rawEvent.getTitle()}`)
        let utcEvent = this.syncedEventsByRawId[rawId].utcEvent

        let title = rawEvent.getTitle();
        let localStartTime = new Date(rawEvent.getStartTime());
        console.log(localStartTime)
        console.log(rawEvent.getStartTime())
        console.log(rawEvent.start)
        let localEndTime = new Date(rawEvent.getEndTime());
        let location = rawEvent.getLocation() || ''; // Get location if available
        let description = rawEvent.getDescription() || ''; // Get description if available
        let isAllDay = rawEvent.isAllDayEvent()
        // let localStartTime = new Date(row[this.columnIndexMap["Start Time (Local)"]]);
        // let localEndTime = new Date(row[this.columnIndexMap["End Time (Local)"]]);

        utcEvent.setTitle(title)
        if (isAllDay) {
            utcEvent.setAllDayDate(localStartTime.date)
        } else {
            utcEvent.setTime(localStartTime, localEndTime)
        }
        utcEvent.setDescription(description)
        utcEvent.setLocation(location)
        console.log("Finished updating event")
    }

    createUTCEventByRawId(rawId) {
        let rawEvent = this.incomingRawEventsById[rawId]
        console.log(`Creating UTC event: ${rawEvent.summary}`)

        let title = rawEvent.summary;
        let start = new Date(rawEvent.start.dateTime);
        let startTimeZone = rawEvent.start.timeZone
        let end = new Date(rawEvent.end.dateTime);
        let endTimeZone = rawEvent.start.timeZone
        let location = rawEvent.location || ''; // Get location if available
        let description = rawEvent.description || ''; // Get description if available
        let isAllDay = !!rawEvent.start.date

        let utcEvent = this.utcCalendar.createEvent(
            title,
            start,
            end,
            {
                description: description || '',
                location: location || '',
                allDay: isAllDay || false
            }
        );
        console.log("Finished creating event")
        return utcEvent
    }

    addEventMapping(rawEvent, utcEvent) {
        this.eventIdMapSheet.appendRow([rawEvent.getId(), utcEvent.getId()])

        this.syncedEventsByRawId[rawEvent.getId()] = {
            utcEventId: utcEvent.getId(),
            rawEventId: rawEvent.getId(),
            mapSheetRowIdx: this.eventIdMapSheet.getRowIndexByColumnValue("UTC Event ID", utcEvent.getId()), // don't need this, no reason to calculate
            // This might not work
            rawEvent: EventAPI.getById(rawEvent),
            utcEvent: EventAPI.getById(utcEvent)
        }
    }
}

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
            console.log(`Creating UTC event: ${row[this.columnIndexMap["Event Title"]]}`)
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
        RawEventsToUTCSyncer,
        RawEventsToUTCSyncer1,
        CalendarToSheetSyncer,
        UTCCalendarSyncer
    };
}