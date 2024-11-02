class TwitterPoster {
    constructor(airtableAPI, twitterAPI) {
        this.airtableAPI = airtableAPI
        this.twitterAPI = twitterAPI
    }

    post() {
        const airtableRecords = this.airtableAPI.getAllRecords()
        const intro = "Upcoming Events..."
        const messages = airtableRecords.map(record => this.airtableRecordToTweet(record))
        this.twitterAPI.sendTweetThread([intro, ...messages])
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