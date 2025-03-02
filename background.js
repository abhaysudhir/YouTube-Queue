// Listen for when the user clicks on the extension icon
chrome.action.onClicked.addListener(async (tab) => {
  // Only act if we're on a YouTube page
  if (tab.url.includes('youtube.com')) {
    console.log('[Background] Extension clicked on a YouTube page');
    
    // Create a notification for debugging if the API is available
    try {
      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon128.png',
          title: 'YouTube Queue',
          message: 'Adding video to queue...',
          priority: 2
        });
      }
    } catch (err) {
      console.error('[Background] Notifications not available:', err);
    }
    
    // Log directly to the page console to verify injection
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => { 
        console.log('%c[YouTube Queue Extension] Script injection started', 'color: blue; font-weight: bold');
      }
    });
    
    // Inject and execute a script that adds the video to queue
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: addVideoToQueue,
        // Don't pass a specific video ID - find a video on the current page instead
        args: []
      });
      
      const result = results[0].result;
      console.log('[Background] Script execution result:', result);
      
      // Show notification about success or failure
      try {
        if (chrome.notifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon128.png',
            title: 'YouTube Queue',
            message: result.success ? 
              `Added video to queue: ${result.videoId}` : 
              `Failed: ${result.error}`,
            priority: 2
          });
        }
      } catch (err) {
        console.error('[Background] Notifications error:', err);
      }
      
    } catch (error) {
      console.error('[Background] Error executing script:', error);
      
      // Show notification about the error
      try {
        if (chrome.notifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon128.png',
            title: 'YouTube Queue Error',
            message: `Error: ${error.message}`,
            priority: 2
          });
        }
      } catch (err) {
        console.error('[Background] Notifications error:', err);
      }
      
      // Try to log the error directly to the page console
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: (errorMsg) => { 
            console.error('%c[YouTube Queue Extension] Error', 'color: red; font-weight: bold', errorMsg);
          },
          args: [error.message]
        });
      } catch (e) {
        console.error('[Background] Failed to log to page console:', e);
      }
    }
  } else {
    console.log('[Background] Not a YouTube page');
    // Show notification that this only works on YouTube
    try {
      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon128.png',
          title: 'YouTube Queue',
          message: 'This extension only works on YouTube pages',
          priority: 2
        });
      }
    } catch (err) {
      console.error('[Background] Notifications error:', err);
    }
  }
});

// This function will be injected into the page and executed
function addVideoToQueue(videoId) {
  console.log('%c[YouTube Queue Extension] Attempting to add video to queue', 'color: green; font-weight: bold', videoId || 'from current page');
  
  return new Promise(async (resolve) => {
    try {
      // If no videoId is provided, try to find one
      if (!videoId) {
        console.log('[Queue Extension] No video ID provided, searching for one...');
        videoId = await findTopVideoId();
        
        if (!videoId) {
          console.error('[Queue Extension] Failed to find video ID');
          resolve({
            success: false,
            error: 'Failed to find video ID',
            videoId: null
          });
          return;
        }
      }
      
      console.log('[Queue Extension] Using video ID:', videoId);
      
      // Add a visual notification to the page
      const notification = document.createElement('div');
      notification.style.position = 'fixed';
      notification.style.bottom = '20px';
      notification.style.right = '20px';
      notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      notification.style.color = 'white';
      notification.style.padding = '12px 20px';
      notification.style.borderRadius = '4px';
      notification.style.zIndex = '10000';
      notification.style.fontFamily = 'YouTube Sans, Roboto, Arial, sans-serif';
      notification.textContent = 'Adding to queue...';
      document.body.appendChild(notification);
      
      let success = false;
      let method = '';
      
      // DIRECT METHOD: Use YouTube's internal playlist/create endpoint
      try {
        console.log('[Queue Extension] Trying YouTube playlist/create API');
        
        // Get required API information from YouTube's config
        const apiKey = window.ytcfg && window.ytcfg.get ? window.ytcfg.get('INNERTUBE_API_KEY') : null;
        const clientVersion = window.ytcfg && window.ytcfg.get ? window.ytcfg.get('INNERTUBE_CLIENT_VERSION') : null;
        const visitorData = window.ytcfg && window.ytcfg.get ? window.ytcfg.get('VISITOR_DATA') : null;
        
        // Check if we have the necessary data to make the API request
        if (apiKey && clientVersion) {
          console.log('[Queue Extension] Found YouTube API key and client version');
          
          // Collect basic client information for the request
          const context = {
            client: {
              clientName: "WEB",
              clientVersion: clientVersion,
              hl: document.documentElement.lang || "en",
              gl: "US",
              visitorData: visitorData,
              userAgent: navigator.userAgent
            }
          };
          
          // Build the request payload based on the example
          const payload = {
            context: context,
            title: "Queue",
            videoIds: [videoId],
            params: "CAQ=" // Base64 encoded value for queue operation
          };
          
          // Log the request we're about to make
          console.log('[Queue Extension] Making YouTube playlist/create request:', {
            url: `/youtubei/v1/playlist/create?key=${apiKey}`,
            payload: payload
          });
          
          // Make the request to YouTube's API
          const response = await fetch(`https://www.youtube.com/youtubei/v1/playlist/create?key=${apiKey}`, {
            method: 'POST',
            credentials: 'include', // Important for sending cookies with the request
            headers: {
              'Content-Type': 'application/json',
              'X-Youtube-Client-Name': '1',
              'X-Youtube-Client-Version': clientVersion
            },
            body: JSON.stringify(payload)
          });
          
          // Parse and log the response
          const responseData = await response.json();
          console.log('[Queue Extension] YouTube API response:', responseData);
          
          // Check if the request was successful
          if (response.ok) {
            success = true;
            method = 'youtube_api_direct';
            console.log('[Queue Extension] Successfully added to queue via YouTube API');
          } else {
            console.error('[Queue Extension] YouTube API returned an error:', response.status, responseData);
          }
        } else {
          console.warn('[Queue Extension] Could not find YouTube API key or client version');
        }
      } catch (apiError) {
        console.error('[Queue Extension] YouTube API error:', apiError);
      }
      
      // FALLBACK METHOD 1: Click the "Add to queue" option in the video menu
      if (!success) {
        try {
          console.log('[Queue Extension] Trying to find video and click "Add to queue"');
          
          // Find this video on the page
          const videoElements = Array.from(document.querySelectorAll('ytd-thumbnail, a'))
            .filter(el => {
              const href = el.href || (el.querySelector('a') ? el.querySelector('a').href : '');
              return href && href.includes(`/watch?v=${videoId}`);
            });
          
          // If this video isn't on the page, try finding any video
          if (videoElements.length === 0) {
            const newVideoId = await findTopVideoId();
            if (newVideoId && newVideoId !== videoId) {
              videoId = newVideoId;
              console.log('[Queue Extension] Using video ID from page instead:', videoId);
            }
          }
          
          // Try to find the video again with the possibly new ID
          const updatedVideoElements = Array.from(document.querySelectorAll('ytd-thumbnail, a'))
            .filter(el => {
              const href = el.href || (el.querySelector('a') ? el.querySelector('a').href : '');
              return href && href.includes(`/watch?v=${videoId}`);
            });
          
          console.log(`[Queue Extension] Found ${updatedVideoElements.length} videos with ID ${videoId}`);
          
          // For each video found, try to click its menu and find "Add to queue"
          for (const element of updatedVideoElements) {
            // Find the video container
            const container = element.closest('ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-video-renderer');
            
            if (container) {
              // Look for the menu button
              const menuButton = container.querySelector('button.yt-icon-button, ytd-menu-renderer button, [aria-label="Action menu"]');
              
              if (menuButton) {
                console.log('[Queue Extension] Found menu button, clicking it');
                menuButton.click();
                
                // Wait for menu to appear
                await new Promise(r => setTimeout(r, 300));
                
                // Look for "Add to queue" option
                const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer, tp-yt-paper-item');
                for (const item of menuItems) {
                  const text = item.textContent || item.innerText || '';
                  if (text.toLowerCase().includes('queue')) {
                    console.log('[Queue Extension] Found "Add to queue" option, clicking it');
                    item.click();
                    success = true;
                    method = 'menu_click';
                    break;
                  }
                }
                
                // If we didn't find or click the queue option, close the menu
                if (!success) {
                  document.body.click();
                }
              }
            }
            
            if (success) break;
          }
        } catch (menuError) {
          console.error('[Queue Extension] Menu click error:', menuError);
        }
      }
      
      // FALLBACK METHOD 2: Use player API (if on watch page)
      if (!success && window.location.href.includes('/watch')) {
        try {
          console.log('[Queue Extension] Trying player API on watch page');
          
          const player = document.querySelector('#movie_player');
          if (player && (typeof player.cueVideoById === 'function' || typeof player.loadVideoById === 'function')) {
            if (typeof player.cueVideoById === 'function') {
              player.cueVideoById(videoId);
              console.log('[Queue Extension] Called player.cueVideoById');
            } else {
              player.loadVideoById(videoId);
              console.log('[Queue Extension] Called player.loadVideoById');
            }
            
            success = true;
            method = 'player_api';
          }
        } catch (playerError) {
          console.error('[Queue Extension] Player API error:', playerError);
        }
      }
      
      // FALLBACK METHOD 3: URL modification approach
      if (!success) {
        try {
          console.log('[Queue Extension] Trying URL modification approach');
          
          // Save current URL
          const currentUrl = window.location.href;
          
          // Create queue URL
          const queueUrl = `https://www.youtube.com/watch?v=${videoId}&playnext=1`;
          
          // Use history API to modify URL without page reload
          history.pushState(null, '', queueUrl);
          console.log('[Queue Extension] Changed URL to:', queueUrl);
          
          // Dispatch navigation events
          window.dispatchEvent(new Event('popstate'));
          document.dispatchEvent(new CustomEvent('yt-navigate-finish', {
            detail: { watchEndpoint: { videoId: videoId } }
          }));
          
          // Give YouTube a moment to process
          await new Promise(r => setTimeout(r, 750));
          
          // Return to original URL
          history.pushState(null, '', currentUrl);
          
          success = true;
          method = 'url_modification';
        } catch (urlError) {
          console.error('[Queue Extension] URL modification error:', urlError);
        }
      }
      
      // Update notification to show result
      if (success) {
        notification.textContent = '✓ Added to queue!';
        notification.style.backgroundColor = 'rgba(40, 167, 69, 0.9)';
      } else {
        notification.textContent = '✗ Failed to add to queue';
        notification.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
      }
      
      // Remove notification after a delay
      setTimeout(() => {
        try {
          document.body.removeChild(notification);
        } catch (e) {
          // Notification might have been removed already
        }
      }, 3000);
      
      // Return result
      resolve({
        success: success,
        videoId: videoId,
        source: method || 'all_methods_failed',
        error: success ? null : 'Failed to add to queue'
      });
      
    } catch (error) {
      console.error('[Queue Extension] Error in queue operation:', error);
      
      // Try to remove notification if it exists
      try {
        const notification = document.querySelector('div[style*="position: fixed"][style*="bottom: 20px"]');
        if (notification) {
          notification.textContent = '✗ Error: ' + error.message;
          notification.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
          
          setTimeout(() => {
            try {
              document.body.removeChild(notification);
            } catch (e) {
              // Notification might have been removed already
            }
          }, 3000);
        }
      } catch (e) {}
      
      resolve({
        success: false,
        error: `Exception: ${error.message}`,
        videoId: videoId
      });
    }
  });
  
  // Helper function to find the video ID of the first video on the page
  async function findTopVideoId() {
    console.log('[Queue Extension] Searching for top video ID');
    
    // On watch pages, get the current video ID first
    if (window.location.href.includes('/watch')) {
      const urlParams = new URLSearchParams(window.location.search);
      const currentVideoId = urlParams.get('v');
      if (currentVideoId) {
        console.log(`[Queue Extension] Found current watch page video ID: ${currentVideoId}`);
        return currentVideoId;
      }
    }
    
    // Different selectors to find video containers on different YouTube page types
    const videoContainerSelectors = [
      'ytd-rich-grid-media',       // Homepage videos
      'ytd-video-renderer',        // Search results and recommended videos
      'ytd-compact-video-renderer', // Recommendation shelf & watch page recommendations
      'ytd-grid-video-renderer',    // Channel page videos
      'ytd-rich-item-renderer'     // Another homepage format
    ];
    
    let videoId = null;
    let videoContainer = null;
    
    // If we're on YouTube homepage, get the first video in the main grid
    if (window.location.pathname === '/' || window.location.pathname === '/feed/subscriptions') {
      const containers = document.querySelectorAll('ytd-rich-item-renderer, ytd-grid-video-renderer');
      if (containers.length > 0) {
        console.log(`[Queue Extension] Found ${containers.length} videos on homepage/subscriptions`);
        videoContainer = containers[0];
      }
    }
    
    // If on watch page, try to get a recommended video
    if (!videoContainer && window.location.href.includes('/watch')) {
      const recommendedVideos = document.querySelectorAll('ytd-compact-video-renderer, ytd-compact-radio-renderer');
      if (recommendedVideos.length > 0) {
        console.log(`[Queue Extension] Found ${recommendedVideos.length} recommended videos`);
        videoContainer = recommendedVideos[0];
      }
    }
    
    // If still no container, try general selectors
    if (!videoContainer) {
      // Try each selector until we find a video container
      for (const selector of videoContainerSelectors) {
        const containers = document.querySelectorAll(selector);
        if (containers.length > 0) {
          console.log(`[Queue Extension] Found ${containers.length} video containers with selector: ${selector}`);
          videoContainer = containers[0];
          break;
        }
      }
    }
    
    if (!videoContainer) {
      console.log('[Queue Extension] No video containers found on the page');
      
      // Fallback: try to find any video link on the page
      const videoLinks = document.querySelectorAll('a[href*="/watch?v="]');
      if (videoLinks.length > 0) {
        const href = videoLinks[0].getAttribute('href');
        const match = href.match(/\/watch\?v=([^&]+)/);
        if (match && match[1]) {
          videoId = match[1];
          console.log(`[Queue Extension] Found video ID from page link: ${videoId}`);
          return videoId;
        }
      }
      
      return null;
    }
    
    // Try to find the video ID from the container
    // Method 1: Look for anchors with href containing '/watch?v='
    const anchors = videoContainer.querySelectorAll('a[href*="/watch?v="]');
    for (const anchor of anchors) {
      const href = anchor.getAttribute('href');
      const match = href.match(/\/watch\?v=([^&]+)/);
      if (match && match[1]) {
        videoId = match[1];
        console.log(`[Queue Extension] Found video ID from anchor: ${videoId}`);
        return videoId;
      }
    }
    
    // Method 2: Look for elements with video-id attribute
    const elementsWithVideoId = videoContainer.querySelectorAll('[video-id]');
    for (const element of elementsWithVideoId) {
      videoId = element.getAttribute('video-id');
      if (videoId) {
        console.log(`[Queue Extension] Found video ID from attribute: ${videoId}`);
        return videoId;
      }
    }
    
    // Method 3: Look for data attributes that might contain video IDs
    const potentialElements = videoContainer.querySelectorAll('[data-video-id], [data-vid], [data-videoid]');
    for (const element of potentialElements) {
      videoId = element.getAttribute('data-video-id') || 
               element.getAttribute('data-vid') || 
               element.getAttribute('data-videoid');
      if (videoId) {
        console.log(`[Queue Extension] Found video ID from data attribute: ${videoId}`);
        return videoId;
      }
    }
    
    // If we still don't have a video ID, try to extract it from the container's HTML
    const html = videoContainer.outerHTML;
    const idMatches = html.match(/\/watch\?v=([^&"']+)/);
    if (idMatches && idMatches[1]) {
      videoId = idMatches[1];
      console.log(`[Queue Extension] Found video ID from HTML: ${videoId}`);
      return videoId;
    }
    
    console.log('[Queue Extension] Could not find video ID');
    return null;
  }
}

// Handle any service worker initialization for Manifest V3
if (typeof self !== 'undefined' && self.addEventListener) {
  // Listen for fetch events
  self.addEventListener('fetch', event => {
    // Only intercept YouTube navigation requests related to our queue feature
    if (event.request.url.includes('youtube.com') && 
        event.request.url.includes('playnext=1')) {
      console.log('[Service Worker] Intercepting YouTube queue request:', event.request.url);
      
      // Ensure navigation preload requests are properly handled
      event.respondWith(
        (async () => {
          try {
            // Wait for preload if available, then proceed with fetch
            const preloadResponse = await event.preloadResponse;
            if (preloadResponse) {
              console.log('[Service Worker] Using preload response');
              return preloadResponse;
            }
            
            // Otherwise, do a normal fetch
            return fetch(event.request);
          } catch (error) {
            console.error('[Service Worker] Fetch error:', error);
            
            // Return a basic response if fetching fails
            return new Response('Error adding to queue', {
              status: 200,
              headers: {'Content-Type': 'text/plain'}
            });
          }
        })()
      );
    }
  });
}