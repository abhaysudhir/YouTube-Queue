// Listen for when the user clicks on the extension icon
chrome.action.onClicked.addListener(async (tab) => {
  // Only act if we're on a YouTube page
  if (tab.url.includes('youtube.com')) {
    console.log('Extension clicked on a YouTube page');
    
    // Inject and execute a script that adds the top video to queue
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: addTopVideoToQueue
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
function addTopVideoToQueue() {
  return new Promise(async (resolve) => {
    console.log('Looking for the top video menu button');
    
    // Different selectors to find video menu buttons on different YouTube page types
    const videoContainerSelectors = [
      // Homepage videos
      'ytd-rich-grid-media',
      // Search results and recommended videos
      'ytd-video-renderer',
      // Recommendation shelf
      'ytd-compact-video-renderer',
      // Watch page recommendations
      'ytd-compact-video-renderer'
    ];
    
    // Try each selector until we find a video container
    let menuButton = null;
    let videoContainer = null;
    
    for (const selector of videoContainerSelectors) {
      const containers = document.querySelectorAll(selector);
      if (containers.length > 0) {
        console.log(`Found ${containers.length} video containers with selector: ${selector}`);
        videoContainer = containers[0];
        break;
      }
    }
    
    if (!videoContainer) {
      console.log('No video containers found on the page');
      resolve(false);
      return;
    }
    
    // Find the three dots menu button within the container
    // Different possible selectors for the menu button
    const menuButtonSelectors = [
      // Look for button with "More" in aria-label or text
      'button[aria-label*="More"], button[aria-label*="more"], yt-icon-button[aria-label*="Action"], button.yt-icon-button[aria-label*="actions"]',
      // Menu button that often appears on hover
      'ytd-menu-renderer button, .ytd-menu-renderer button, .dropdown-trigger',
      // Three dots icon inside video containers
      'yt-icon-button.ytd-menu-renderer, .ytd-thumbnail-overlay-toggle-button-renderer'
    ];
    
    for (const selector of menuButtonSelectors) {
      const buttons = videoContainer.querySelectorAll(selector);
      if (buttons.length > 0) {
        menuButton = buttons[0];
        console.log(`Found menu button with selector: ${selector}`);
        break;
      }
    }
    
    // If still not found, try a more general approach
    if (!menuButton) {
      // Get all buttons that might be menu buttons
      const allButtons = document.querySelectorAll('button, yt-icon-button');
      
      for (const btn of allButtons) {
        const label = btn.getAttribute('aria-label') || '';
        if (label.toLowerCase().includes('action') || 
            label.toLowerCase().includes('more') || 
            label.toLowerCase().includes('menu')) {
          menuButton = btn;
          console.log('Found menu button through aria-label search');
          break;
        }
      }
    }
    
    if (!menuButton) {
      console.log('Could not find the menu button');
      resolve(false);
      return;
    }
    
    // Click the menu button
    console.log('Clicking the menu button');
    menuButton.click();
    
    // Wait for the menu to appear
    await new Promise(r => setTimeout(r, 500));
    
    // Look for "Add to queue" option in the menu
    console.log('Looking for "Add to queue" option');
    
    const queueOptionSelectors = [
      // Text-based search in dropdown menu items
      'ytd-menu-service-item-renderer, tp-yt-paper-item, ytd-menu-navigation-item-renderer',
      // General dropdown items
      '.ytd-menu-popup-renderer tp-yt-paper-item, .ytd-menu-popup-renderer ytd-menu-service-item-renderer'
    ];
    
    let queueOption = null;
    
    // First try to find the option through selectors
    for (const selector of queueOptionSelectors) {
      const options = document.querySelectorAll(selector);
      for (const option of options) {
        const text = option.textContent.toLowerCase();
        if (text.includes('queue') || text.includes('add to queue')) {
          queueOption = option;
          console.log(`Found "Add to queue" option with selector: ${selector}`);
          break;
        }
      }
      if (queueOption) break;
    }
    
    // If not found, try a general approach
    if (!queueOption) {
      // Get all elements that might be menu items
      const allItems = document.querySelectorAll('ytd-menu-service-item-renderer, tp-yt-paper-item, ytd-menu-navigation-item-renderer, button');
      
      for (const item of allItems) {
        const text = item.textContent.toLowerCase();
        if (text.includes('queue') || text.includes('add to queue')) {
          queueOption = item;
          console.log('Found "Add to queue" option through text content search');
          break;
        }
      }
    }
    
    if (!queueOption) {
      console.log('Could not find the "Add to queue" option');
      // Click somewhere else to close the menu
      document.body.click();
      resolve(false);
      return;
    }
    
    // Click the "Add to queue" option
    console.log('Clicking the "Add to queue" option');
    queueOption.click();
    
    // Report success
    console.log('Successfully added to queue');
    resolve(true);
  });
} 