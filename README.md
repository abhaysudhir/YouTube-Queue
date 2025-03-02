 # YouTube Queue

A simple YouTube chrome extension built to queue up all your open YouTube tabs.

- [ ] Figure out how YouTube handles queuing videos
- [ ] Client Side or Server Side? Document



Current Plan:

To replicate YouTube's "Add to Queue" functionality in your Chrome extension, you'll need to implement these 3 API requests with precise headers, cookies, and payloads. Here's the technical breakdown:

---

### **1. Playlist Creation (Queue Initialization)**
**Endpoint:** `POST /youtubei/v1/playlist/create`
```http
POST /youtubei/v1/playlist/create?prettyPrint=false HTTP/2
Host: www.youtube.com
Authorization: SAPISIDHASH [TIMESTAMP]_[HASH]
X-Youtube-Client-Name: 1
X-Youtube-Client-Version: 2.20250228.01.00
Content-Type: application/json
Cookie: [SESSION_COOKIES]
```

**Key Requirements:**
```json
{
  "context": { /* Client/device context */ },
  "title": "Queue",
  "videoIds": ["VIDEO_ID"],
  "params": "CAQ=" (Base64 encoded "2")
}
```

**Purpose:**  
Creates a temporary playlist named "Queue" with the video. YouTube's queue is essentially a transient playlist.

---

### **2. Player Initialization**
**Endpoint:** `POST /youtubei/v1/player`
```http
POST /youtubei/v1/player?prettyPrint=false HTTP/2
Host: www.youtube.com
Authorization: SAPISIDHASH [SAME_AS_ABOVE]
```

**Payload Essentials:**
```json
{
  "videoId": "VIDEO_ID",
  "playbackContext": {
    "contentPlaybackContext": {
      "signatureTimestamp": 20145, // Critical for DRM
      "referer": "https://www.youtube.com/"
    }
  },
  "serviceIntegrityDimensions": {
    "poToken": "DYNAMIC_TOKEN" // Anti-bot measure
  }
}
```

**Purpose:**  
Prepares the video player and verifies playback rights.

---

### **3. Navigation Update**
**Endpoint:** `POST /youtubei/v1/next`
```http
POST /youtubei/v1/next?prettyPrint=false HTTP/2
Host: www.youtube.com
Authorization: SAPISIDHASH [SAME_AS_ABOVE]
```

**Key Parameters:**
```json
{
  "videoId": "VIDEO_ID",
  "autonavState": "STATE_OFF", // Disables autoplay
  "playbackContext": {
    "vis": 0, // Visibility state
    "lactMilliseconds": "-1" // Last activity time
  }
}
```

**Purpose:**  
Updates the UI/UX state after queue modification.

---

### **Critical Components to Replicate**
1. **Authentication**
   - **SAPISIDHASH** = SHA1(TIMESTAMP + " " + SAPISID + " " + ORIGIN)
   - Use Chrome's `chrome.cookies` API to get SAPISID cookie
   - Example Hash: `1740884797_39a917bc7a76e398bc20e130a22caf97de85d7b3_u`

2. **Session Cookies**
   Essential cookies to maintain:
   ```text
   LOGIN_INFO
   SID
   HSID
   SSID
   APISID
   __Secure-1PSID
   __Secure-3PSID
   ```

3. **Client Context**
   Replicate this structure with dynamic values:
   ```json
   "context": {
     "client": {
       "hl": "en",
       "gl": "US",
       "clientName": "WEB",
       "clientVersion": "2.20250228.01.00",
       "userAgent": "[CHROME_USER_AGENT]",
       "visitorData": "Cgs...[BASE64_DATA]"
     },
     "user": {"lockedSafetyMode": false},
     "clickTracking": {"clickTrackingParams": "BASE64_DATA"}
   }
   ```

---

### **Implementation Strategy**
1. **Cookie Management**
   ```javascript
   chrome.cookies.getAll({domain: 'youtube.com'}, (cookies) => {
     // Filter and store required cookies
   });
   ```

2. **Dynamic Headers**
   ```javascript
   const headers = {
     'Authorization': `SAPISIDHASH ${timestamp}_${sha1Hash}`,
     'X-Youtube-Client-Version': '2.20250228.01.00',
     'X-Origin': 'https://www.youtube.com',
     'X-Goog-Visitor-Id': visitorId
   };
   ```

3. **Payload Generation**
   ```javascript
   const payload = {
     context: getClientContext(),
     videoId: videoId,
     params: "CAQ="
   };
   ```

4. **Request Chaining**
   ```javascript
   createQueue()
     .then(initPlayer)
     .then(updateNavigation);
   ```

---

### **Security Considerations**
1. Use Chrome's `chrome.identity` API for OAuth when possible
2. Never store raw cookies in extension storage
3. Implement request signature rotation (YouTube changes hashing algorithms periodically)

---

### **Debugging Tips**
1. Monitor `visitorData` and `clientVersion` - these change frequently
2. Handle 403 errors by refreshing SAPISIDHASH
3. Use YouTube's debug pages at `youtube.com/debug`

Would you like me to provide sample code for any specific part of this implementation?