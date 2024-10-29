class GCalToAirtableSyncer {
    constructor(sourceCalendars, airtableEventsAPI, airtableUsersAPI) {
        this.sourceCalendars = sourceCalendars
        this.airtableEventsAPI = airtableEventsAPI
        this.airtableUsersAPI = airtableUsersAPI
    }

    sync() {
        let eventsForAirtable = this.getAllSourceEvents()
            .map(event => this.prepEventForAirtable(event))
        this.airtableEventsAPI.upsertRecords(eventsForAirtable)
        this.deleteOldEvents()
    }

    getAllSourceEvents() {
        let events = []
        this.sourceCalendars.forEach(calendar => {
            events = events.concat(calendar.getAllEvents())
        })
        return events
    }

    prepEventForAirtable(gCalEvent) {
        let creatorID = this.getUserIDFromEmail(gCalEvent.creator.email)
        let utcStart = gCalEvent.start.dateTime
            ? this.toUTC(gCalEvent.start.dateTime, gCalEvent.start.timeZone)
            : gCalEvent.start.date
        let utcEnd = gCalEvent.end.dateTime
            ? this.toUTC(gCalEvent.end.dateTime, gCalEvent.end.timeZone)
            : gCalEvent.end.date
        let startDate = this.getDateFromTime(utcStart)
        return {
            fields: {
                Title: gCalEvent.summary,
                Creator: [creatorID],
                Start: utcStart,
                End: utcEnd,
                Date: startDate,
                "All Day": !!gCalEvent.start.date,
                GCalID: gCalEvent.id
            }
        }
    }

    getDateFromTime(dateTimeString) {
        const date = new Date(dateTimeString);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-indexed
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`
    }

    getUserIDFromEmail(email) {
        let userRecord = this.airtableUsersAPI.upsertRecords([{ fields: { Email: email } }])[0]
        return userRecord.id
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

    deleteOldEvents() {
        let airtableEvents = this.airtableEventsAPI.getAllRecords()
        let gCalEventIds = this.getAllSourceEvents().map(event => event.id)
        let airtableEventsToDelete = airtableEvents
            .filter(event => !gCalEventIds.includes(event.fields.GCalID))
            .map(event => event.id)
        return this.airtableEventsAPI.deleteRecords(airtableEventsToDelete)
    }
}

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


if (typeof module !== 'undefined') {
    module.exports = { RawEventsToUTCSyncer, GCalToAirtableSyncer };
}