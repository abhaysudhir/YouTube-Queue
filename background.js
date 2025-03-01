// Listen for when the user clicks on the extension icon
chrome.action.onClicked.addListener(async (tab) => {
  // Only act if we're on a YouTube page
  if (tab.url.includes('youtube.com')) {
    console.log('Extension clicked on a YouTube page');
    
    // Inject and execute a script that clicks the top video
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: clickTopVideo
      });
    } catch (error) {
      console.error('Error executing script:', error);
    }
  } else {
    console.log('Not a YouTube page');
    // Optionally show a notification or alert that this only works on YouTube
  }
});

// This function will be injected into the page and executed
function clickTopVideo() {
  console.log('Looking for the top video');
  
  // Different selectors to find videos on different YouTube page types
  const selectors = [
    // Homepage videos
    'ytd-rich-grid-media a#thumbnail',
    // Search results and recommended videos
    'ytd-video-renderer a#thumbnail',
    // Shorts
    'ytd-reel-video-renderer a#thumbnail',
    // General purpose backup
    'a[href^="/watch"]'
  ];
  
  // Try each selector until we find a video
  for (const selector of selectors) {
    const videos = document.querySelectorAll(selector);
    if (videos.length > 0) {
      console.log(`Found ${videos.length} videos with selector: ${selector}`);
      // Click the first video
      videos[0].click();
      return true;
    }
  }
  
  console.log('No videos found on the page');
  return false;
} 