class FacebookAPI {
  post(message="Testing something...") {
  // Replace with your Facebook Page ID and access token
  const facebookPageId = secrets.FACEBOOK.PAGE_ID;
  const accessToken = secrets.FACEBOOK.PAGE_ACCESS_TOKEN;

  const facebookUrl = `https://graph.facebook.com/${facebookPageId}/feed`;

  // Create the payload for the POST request
  const payload = {
    'message': message,
    'access_token': accessToken
  };

  try {
    // Send the POST request to Facebook's Graph API
    const response = UrlFetchApp.fetch(facebookUrl, {
      'method': 'post',
      'payload': payload
    });

    // Log the response to the console
    Logger.log('Successfully posted on Facebook: ' + response.getContentText());

    // Return the response as JSON
    return JSON.parse(response.getContentText());
  } catch (error) {
    // Log and throw any errors
    Logger.log('Error posting to Facebook: ' + error.message);
    throw new Error('Error posting to Facebook: ' + error.message);
  }
}

}

class TwitterAPI {
    // Based on https://blog.devgenius.io/how-to-create-tweet-automation-with-google-apps-script-from-google-sheet-a25b2f09ab1b

    /**
     * Create the OAuth2 Twitter Service
     * @return OAuth2 service
     */
    getService() {
        const CLIENT_ID = secrets.TWITTER.OAuth2.ClientID
        const CLIENT_SECRET = secrets.TWITTER.OAuth2.ClientSecret
        var userProps = PropertiesService.getUserProperties();
        this.pkceChallengeVerifier();
        return OAuth2.createService('twitter')
            .setAuthorizationBaseUrl('https://twitter.com/i/oauth2/authorize')
            .setTokenUrl('https://api.twitter.com/2/oauth2/token?code_verifier=' + userProps.getProperty("code_verifier"))
            // Set the client ID and secret.
            .setClientId(CLIENT_ID)
            .setClientSecret(CLIENT_SECRET)
            .setCallbackFunction('twitterAuthCallback')
            // Set the property store where authorized tokens should be persisted.
            .setPropertyStore(userProps)
            // Set the scopes to request (space-separated for Twitter services).
            .setScope('users.read tweet.read offline.access tweet.write')

            // Add parameters in the authorization url
            .setParam('response_type', 'code')
            .setParam('code_challenge_method', 'S256')
            .setParam('code_challenge', userProps.getProperty("code_challenge"))
            .setTokenHeaders({
                'Authorization': 'Basic ' + Utilities.base64Encode(CLIENT_ID + ':' + CLIENT_SECRET),
                'Content-Type': 'application/x-www-form-urlencoded'
            })
    }

    /**
     * Reset the OAuth2 Twitter Service
     */
    reset() {
        this.getService().reset();
        PropertiesService.getUserProperties().deleteProperty("code_challenge");
        PropertiesService.getUserProperties().deleteProperty("code_verifier");
    }

    /**
     * Generate PKCE Challenge Verifier for Permission for OAuth2 Twitter Service
     */
    pkceChallengeVerifier() {
        var userProps = PropertiesService.getUserProperties();
        if (!userProps.getProperty('code_verifier')) {
            var verifier = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
            for (var i = 0; i < 128; i++) {
                verifier += possible.charAt(Math.floor(Math.random() * possible.length));
            }
            var sha256hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, verifier);
            var challenge = Utilities.base64Encode(sha256hash)
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '')
            userProps.setProperty("code_verifier", verifier)
            userProps.setProperty("code_challenge", challenge)
        }
    }

    sendTweetThread(messages) {
        let tweetIds = []
        messages.forEach(message => {
            let lastTweetId = tweetIds.slice(-1)[0]
            tweetIds.push(this.sendSingleTweet(message, lastTweetId))
        });
        return tweetIds
    }

    /**
     * Send the Tweet
     * @Param tweet Text to tweet
     * @Param replyTo id of the tweet to reply
     * @return the ID of the current Tweet
     */
    sendSingleTweet(tweet, replyTo) {
        tweet = tweet || "Testing Something..."
        var payload = {
            text: tweet
        }
        if (replyTo) {
            payload['reply'] = {
                in_reply_to_tweet_id: replyTo
            }
        }
        var service = this.getService();
        if (service.hasAccess()) {
            // https://developer.twitter.com/en/docs/twitter-api/users/lookup/api-reference/get-users-by-username-username
            var url = `https://api.twitter.com/2/tweets`;
            var response = UrlFetchApp.fetch(url, {
                method: 'POST',
                'contentType': 'application/json',
                headers: {
                    Authorization: 'Bearer ' + service.getAccessToken()
                },
                muteHttpExceptions: true,
                payload: JSON.stringify(payload)
            });
            var result = JSON.parse(response.getContentText());
            return result.data.id;
        } else {
            var authorizationUrl = service.getAuthorizationUrl();
            Logger.log('Open the following URL and re-run the script: %s',
                authorizationUrl);
        }
    }
}

function twitterAuthCallback(request) {
    var service = new TwitterAPI().getService();
    var authorized = service.handleCallback(request);
    if (authorized) {
        return HtmlService.createHtmlOutput('Success!');
    } else {
        return HtmlService.createHtmlOutput('Denied');
    }
}

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

    getEventsInRange(fromDate, toDate) {
        let events = [];
        let pageToken;

        do {
            let response = Calendar.Events.list(this.calendarId, {
                pageToken: pageToken,
                maxResults: 2500,
                showDeleted: false,
                singleEvents: true,
                timeMin: fromDate,
                timeMax: toDate
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
                  const separator = this.url.includes('?') ? '&' : '?';
                  urlWithOffset = `${this.url}${separator}offset=${result.offset}`;
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
