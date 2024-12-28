class FacebookAPI {
    post(message = "Testing something...") {
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

function getGoogleAccessToken() {
    const url = "https://oauth2.googleapis.com/token";

    // Create the JWT header and payload
    const header = {
        alg: "RS256",
        typ: "JWT"
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: secrets.GOOGLE.SERVICE_ACCOUNT_EMAIL,
        scope: "https://www.googleapis.com/auth/calendar",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600, // 1 hour in the future
        iat: now
    };

    // Encode to Base64
    const base64Encode = (obj) => {
        const json = JSON.stringify(obj);
        return Utilities.base64EncodeWebSafe(json).replace(/=+$/, "");
    };

    const encodedHeader = base64Encode(header);
    const encodedPayload = base64Encode(payload);

    // Sign the JWT with the private key
    const signature = Utilities.base64EncodeWebSafe(
        Utilities.computeRsaSha256Signature(`${encodedHeader}.${encodedPayload}`, secrets.GOOGLE.PRIVATE_KEY)
    );

    const jwt = `${encodedHeader}.${encodedPayload}.${signature}`;

    // Exchange the JWT for an access token
    const options = {
        method: "post",
        contentType: "application/x-www-form-urlencoded",
        payload: {
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt
        }
    };

    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    return json.access_token;
}


class GCalAPI {
    constructor(calendarId, accessToken) {
        this.calendarId = calendarId;
        this.accessToken = accessToken;
        this.baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
    }

    fetchApi(endpoint, options = {}) {
        const defaultHeaders = {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json"
        };

        const response = UrlFetchApp.fetch(endpoint, {
            ...options,
            headers: { ...defaultHeaders, ...(options.headers || {}) },
            muteHttpExceptions: true
        });

        if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
            return JSON.parse(response.getContentText());
        } else {
            throw new Error(`API request failed: ${response.getContentText()}`);
        }
    }

    getAllEvents() {
        let events = [];
        let pageToken;

        do {
            const params = {
                maxResults: 2500,
                showDeleted: false,
                singleEvents: true,
            };
            if (pageToken) {
                params.pageToken = pageToken
            }

            const query = Object.keys(params)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
                .join("&");
            const response = this.fetchApi(`${this.baseUrl}?${query}`);
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
            const params = {
                maxResults: 2500,
                showDeleted: false,
                singleEvents: true,
                timeMin: fromDate,
                timeMax: toDate,
            };
            if (pageToken) {
                params.pageToken = pageToken
            }

            const query = Object.keys(params)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
                .join("&");

            const response = this.fetchApi(`${this.baseUrl}?${query}`);
            if (response.items && response.items.length > 0) {
                events = events.concat(response.items);
            }
            pageToken = response.nextPageToken;
        } while (pageToken);

        return events;
    }

    createEvent(eventData) {
        try {
            let createdEvent = this.fetchApi(this.baseUrl, {
                method: "post",
                payload: JSON.stringify(eventData)
            });
            Logger.log("Event created: " + createdEvent.htmlLink);
            return createdEvent;
        } catch (error) {
            Logger.log("Error creating event: " + error.message);
        }
    }

    updateEvent(eventId, eventOptions) {
        try {
            let updatedEvent = this.fetchApi(`${this.baseUrl}/${eventId}`, {
                method: "put",
                payload: JSON.stringify(eventOptions)
            });
            Logger.log('Event updated: ' + updatedEvent.htmlLink);
            return updatedEvent;
        } catch (error) {
            Logger.log("Error updating event: " + error.message);
        }
    }

    deleteEvent(eventId) {
        try {
            this.fetchApi(`${this.baseUrl}/${eventId}`, {
                method: "delete"
            });
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
