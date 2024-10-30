class GCalAPI {
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
                singleEvents: true
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

class AirtableAPI {
    constructor(url, upsertFieldsToMatchOn) {
        this.url = url;
        this.upsertFieldsToMergeOn = upsertFieldsToMatchOn;
        this.auth = `Bearer ${secrets.AIRTABLE.API_KEY}`;
    }

    getAllRecords() {
        let headers = {
            'Authorization': this.auth,
            "Content-Type": "application/json"
        };
        let options = {
            headers: headers,
            method: "GET"
        };

        let allRecords = [];
        let urlWithOffset = this.url;
        let hasMorePages = true;

        while (hasMorePages) {
            try {
                let response = this.fetchWithRateLimit(urlWithOffset, options);
                let result = JSON.parse(response);
                allRecords = allRecords.concat(result.records);
                if (result.offset) {
                    urlWithOffset = `${this.url}?offset=${result.offset}`;
                } else {
                    hasMorePages = false;
                }

            } catch (error) {
                console.error("Error fetching data:", error);
                break;
            }
        }

        return allRecords;
    }

    createRecords(records) {
        let headers = {
            'Authorization': this.auth,
            "Content-Type": "application/json"
        };

        let createdRecords = [];

        // Split records into batches of 10
        for (let i = 0; i < records.length; i += 10) {
            let batch = records.slice(i, i + 10);
            let payload = JSON.stringify({ records: batch });

            let options = {
                headers: headers,
                method: "POST",
                payload: payload
            };

            try {
                let response = this.fetchWithRateLimit(this.url, options);
                let result = JSON.parse(response);

                // Append the created records to the final array
                createdRecords = createdRecords.concat(result.records);
            } catch (error) {
                console.error("Error creating events:", error);
                break; // Exit the loop on failure
            }
        }

        return createdRecords;
    }


    upsertRecords(records) {
        const headers = {
            'Authorization': this.auth,
            "Content-Type": "application/json"
        };

        const upsertedRecords = [];
        const batchSize = 10;

        // Split records into batches of 10
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const payload = JSON.stringify({
                performUpsert: {
                    fieldsToMergeOn: this.upsertFieldsToMergeOn
                },
                records: batch
            });

            const options = {
                headers: headers,
                method: "PATCH",
                payload: payload
            };

            try {
                const response = this.fetchWithRateLimit(this.url, options);
                const result = JSON.parse(response);

                // Append the upserted records to the final array
                upsertedRecords.push(...result.records);
            } catch (error) {
                console.error("Error upserting events:", error);
                break; // Exit the loop on failure
            }
        }

        return upsertedRecords;
    }

    deleteRecords(recordIds) {
        const headers = {
            'Authorization': this.auth,
            "Content-Type": "application/json"
        };

        const deletedRecords = [];
        const batchSize = 10;

        // Split record IDs into batches of 10
        for (let i = 0; i < recordIds.length; i += batchSize) {
            const batch = recordIds.slice(i, i + batchSize);

            const url = `${this.url}?records[]=${batch.join('&records[]=')}`;

            const options = {
                headers: headers,
                method: "DELETE"
            };

            try {
                const response = this.fetchWithRateLimit(url, options);
                const result = JSON.parse(response);

                // Append the deleted records to the final array
                deletedRecords.push(...result.records);
            } catch (error) {
                console.error("Error deleting events:", error);
                break; // Exit the loop on failure
            }
        }

        return deletedRecords;
    }

    fetchWithRateLimit(url, options) {
        let maxRetries = 5;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            let response = UrlFetchApp.fetch(url, options);
            if (response.getResponseCode() === 429) { // Rate limit error
                console.warn("Rate limit reached. Retrying in 30 seconds...");
                Utilities.sleep(30000);
            } else {
                return response.getContentText();
            }
        }
        throw new Error("Failed to fetch data due to rate limits.");
    }
}
