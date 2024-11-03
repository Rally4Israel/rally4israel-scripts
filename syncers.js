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
                GCalID: gCalEvent.id,
                Location: gCalEvent.location,
                Description: this.HTMLToString(gCalEvent.description),
                "Recurring Event": !!gCalEvent.recurringEventId,
                "Recurring Event ID": gCalEvent.recurringEventId || ""
            }
        }
    }

    HTMLToString(html) {
        try {
            const $ = Cheerio.load(`<div>${html}</div>`);
            return $('div').text();
        } catch (error) {
            if (error instanceof ReferenceError) return html;
            else throw error;
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

if (typeof module !== 'undefined') {
    module.exports = { GCalToAirtableSyncer };
}