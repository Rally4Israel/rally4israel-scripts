PostType = {
    TenDays: "Ten Days",
    FiveEvents: "Five Events"
}

class SocialPoster {
    constructor(airtableAPI, twitterAPI, facebookAPI) {
        this.airtableAPI = airtableAPI
        this.twitterAPI = twitterAPI
        this.postType = PostType.TenDays
        this.facebookAPI = facebookAPI
    }

    post() {
        this.startTime = new Date()
        const airtableRecords = this.getAirtableRecords()
        if (airtableRecords.length < 1) return
        const eventMessages = airtableRecords.map(record => this.airtableRecordToMessage(record))
        const intro = this.getIntroMessage()
        this.twitterAPI.sendTweetThread([intro, ...eventMessages])
        const facebookSubMessages = [intro, ...eventMessages]
        this.facebookAPI.post(facebookSubMessages.join('\n\n'))
    }

    getIntroMessage() {
        let message = "Upcoming rallies for Israel, the Jewish community, and the hostages' release"
        if (this.postType === PostType.TenDays) {
            message += " (next 10 days)"
        }
        let lines = [
            `🇮🇱 ${message} ⤵️`,
            "🔗 Check out rally4israel.com/calendar for more details.",
            "👉 Know about an event not listed here? Send us the info!"
        ]
        return lines.join('\n')
    }

    getAirtableRecords() {
        let records = this.airtableAPI.getAllRecords()
            .filter(record => this.isFutureEvent(record))
            .sort((a, b) => this.sortByStartDate(a, b))
        records = this.filterOutRecurringEvents(records)
        let eventsBeforeCutoff = this.getEventsBeforeCutoff(records, 10)
        if (eventsBeforeCutoff.length >= 5) {
            return eventsBeforeCutoff
        } else {
            this.postType = PostType.FiveEvents
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
        let start = new Date(record.fields.Start);
        let startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        let currentDateOnly = new Date(this.startTime.getFullYear(), this.startTime.getMonth(), this.startTime.getDate());
        return startDateOnly >= currentDateOnly;
    }

    sortByStartDate(a, b) {
        return new Date(a.fields.Start) - new Date(b.fields.Start)
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

    airtableRecordToMessage(record) {
        const lines = []
        lines.push(record.fields.Title)
        lines.push(...this.getTweetEventTime(record))
        const location = this.getLocation(record)
        if (location) {
            lines.push(location)
        }
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
    module.exports = { SocialPoster };
}