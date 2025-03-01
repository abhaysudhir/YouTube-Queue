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
    await new Promise(r => setTimeout(r, 1500)); // Increased delay even more
    
    // Look for "Add to queue" option in the menu using the exact HTML structure
    console.log('Looking for "Add to queue" option');
    
    // Direct targeting based on the provided HTML structure
    function findAddToQueueOption() {
      // First option: Find the first menu service item in the dropdown
      // The "Add to queue" option is typically the first item in the dropdown menu
      const contentWrapper = document.getElementById('contentWrapper');
      if (contentWrapper) {
        console.log('Found contentWrapper');
        const firstMenuItem = contentWrapper.querySelector('ytd-menu-service-item-renderer');
        if (firstMenuItem) {
          console.log('Found first menu item in the dropdown');
          return firstMenuItem.querySelector('tp-yt-paper-item');
        }
      }
      
      // Second option: Look for the exact item with text content "Add to queue"
      const queueItems = document.querySelectorAll('ytd-menu-service-item-renderer');
      for (const item of queueItems) {
        const text = item.textContent.trim();
        if (text.includes('Add to queue')) {
          console.log('Found "Add to queue" item by text content');
          return item.querySelector('tp-yt-paper-item');
        }
      }
      
      // Third option: Find by the exact formatted string
      const formattedStrings = document.querySelectorAll('yt-formatted-string');
      for (const str of formattedStrings) {
        if (str.textContent.trim() === 'Add to queue') {
          console.log('Found the exact text "Add to queue"');
          // Go up to the paper-item
          return str.closest('tp-yt-paper-item');
        }
      }
      
      // Fourth option: Find by the paper-listbox and then the first item
      const paperListbox = document.querySelector('tp-yt-paper-listbox#items');
      if (paperListbox) {
        console.log('Found paper-listbox');
        const firstItem = paperListbox.querySelector('ytd-menu-service-item-renderer');
        if (firstItem) {
          console.log('Found first item in paper-listbox');
          return firstItem.querySelector('tp-yt-paper-item');
        }
      }

      // Fifth option: Direct querySelector for the structure
      const directItem = document.querySelector('ytd-menu-popup-renderer tp-yt-paper-listbox ytd-menu-service-item-renderer.iron-selected tp-yt-paper-item');
      if (directItem) {
        console.log('Found direct match for the menu item structure');
        return directItem;
      }
      
      // If all else fails, try to find any paper-item with the right icon and text
      const allPaperItems = document.querySelectorAll('tp-yt-paper-item');
      for (const item of allPaperItems) {
        if (item.textContent.trim().includes('Add to queue')) {
          console.log('Found "Add to queue" in paper-item');
          return item;
        }
      }
      
      return null;
    }
    
    // Try to find the right option and click it after a sufficient delay
    await new Promise(r => setTimeout(r, 500)); // Extra delay to make sure menu is fully rendered
    
    const queueOption = findAddToQueueOption();
    
    if (!queueOption) {
      console.log('Could not find the "Add to queue" option');
      // Print all menu items for debugging
      console.log('Available menu items:');
      const allItems = document.querySelectorAll('ytd-menu-service-item-renderer');
      allItems.forEach((item, index) => {
        console.log(`Menu item ${index}: ${item.textContent.trim()}`);
      });
      
      // Click somewhere else to close the menu
      document.body.click();
      resolve(false);
      return;
    }
    
    // Click the "Add to queue" option
    console.log('Clicking the "Add to queue" option');
    try {
      // Try several clicking methods to ensure one works
      queueOption.click();
      
      // If normal click doesn't work, try dispatching a mouse event
      setTimeout(() => {
        console.log('Trying MouseEvent click as fallback');
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        queueOption.dispatchEvent(clickEvent);
      }, 300);
    } catch (error) {
      console.error('Error clicking:', error);
    }
    
    // Report success
    console.log('Successfully added to queue');
    resolve(true);
  });
} 