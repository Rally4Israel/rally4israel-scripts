class TwitterPoster {
    constructor(airtableAPI, twitterAPI) {
        this.airtableAPI = airtableAPI
        this.twitterAPI = twitterAPI

        // Bind methods to retain `this` context
        this.isFutureEvent = this.isFutureEvent.bind(this)
        this.sortByStartDate = this.sortByStartDate.bind(this)
    }

    post() {
        this.startTime = new Date()
        const airtableRecords = this.getAirtableRecords()
        if (airtableRecords.length < 1) return
        const intro = "Upcoming Events..."
        const messages = airtableRecords.map(record => this.airtableRecordToTweet(record))
        this.twitterAPI.sendTweetThread([intro, ...messages])
    }

    getAirtableRecords() {
        let records = this.airtableAPI.getAllRecords()
            .filter(this.isFutureEvent)
            .sort(this.sortByStartDate)
        records = this.filterOutRecurringEvents(records)
        let eventsBeforeCutoff = this.getEventsBeforeCutoff(records, 10)
        if (eventsBeforeCutoff.length >= 5) {
            return eventsBeforeCutoff
        } else {
            return records.slice(0, 6)
        }
    }

    getEventsBeforeCutoff(records, days) {
        const endDate = new Date();
        endDate.setDate(this.startTime.getDate() + days);
        return records.filter(record => {
            let eventDate = new Date(record.fields.Start)
            return eventDate <= endDate;
        })
    }

    isFutureEvent(record) {
        let start = new Date(record.fields.Start)
        return start > this.startTime
    }

    sortByStartDate(a, b) {
        return new Date(a.fields.Start) - new Date(b.fields.Start)
    }

    sortEventsByDate(records) {
        records.sort((a, b) => {
            return new Date(a.fields.Start) - new Date(b.fields.Start)
        })
    }

    filterOutRecurringEvents(records) {
        const recurringEventIds = {}
        return records.filter(record => {
            let recurringEventId = record.fields["Recurring Event ID"]
            if (!recurringEventId) {
                return true
            }
            if (recurringEventId in recurringEventIds) {
                return false
            }
            recurringEventIds[recurringEventId] = true
            return true
        })
    }

    airtableRecordToTweet(record) {
        const lines = []
        lines.push(record.fields.Title)
        const location = this.getLocation(record)
        if (location) {
            lines.push(location)
        }
        lines.push(...this.getTweetEventTime(record))
        return lines.join('\n')
    }

    getTweetEventTime(record) {
        const airtableDateTime = record.fields.Start
        const date = this.formatDate(airtableDateTime)
        const time = this.formatTime(airtableDateTime)
        const lines = [`🗓️ ${date}`]
        const isAllDay = record.fields["All Day"]
        if (!isAllDay) {
            lines.push(`🕒 ${time}`)
        }
        return lines
    }

    getLocation(record) {
        let location = record.fields.Location
        if (location) {
            return `📌 ${location}`
        }
    }

    formatDate(dateTimeString) {
        const date = new Date(dateTimeString);
        const options = { weekday: 'long', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    formatTime(dateTimeString) {
        const date = new Date(dateTimeString);
        const options = {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'UTC'
        };
        return date.toLocaleTimeString('en-US', options).toLowerCase();
    }
}

if (typeof module !== 'undefined') {
    module.exports = { TwitterPoster };
}