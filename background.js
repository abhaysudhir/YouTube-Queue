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
    
    // Different selectors to find video containers on different YouTube page types
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
    
    // Find the exact 3-dot menu button with specific SVG pattern
    console.log('Looking for the exact 3-dot menu button');
    
    // Function to check if an element has the vertical 3-dot menu SVG
    function hasThreeDotsVerticalSVG(element) {
      const svgContent = element.innerHTML || '';
      // Check for the unique SVG path of the 3-dot menu
      return svgContent.includes('M12 16.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5') || // Exact pattern from user
             svgContent.includes('M10.5 12c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5') || // Another part of the pattern
             (svgContent.includes('viewBox="0 0 24 24"') && // Generic 3-dot menu detection
              svgContent.match(/circle|dot|ellipsis|more/i) &&
              !svgContent.includes('path d="M21 16h-7') && // Exclude other menu icons
              !svgContent.includes('path d="M14.97 16.95')); // Exclude other icons
    }
    
    // First: Look for the exact SVG pattern in the video container
    const iconShapes = videoContainer.querySelectorAll('.yt-icon-shape, yt-icon, svg');
    for (const shape of iconShapes) {
      if (hasThreeDotsVerticalSVG(shape)) {
        console.log('Found 3-dot menu by SVG pattern');
        // Get the button containing this icon
        menuButton = shape.closest('button') || 
                     shape.closest('yt-icon-button') || 
                     shape.closest('[role="button"]') ||
                     shape;
        break;
      }
    }
    
    // Second: Look within menu renderer for any button-like element
    if (!menuButton) {
      const menuRenderers = videoContainer.querySelectorAll('ytd-menu-renderer, [id*="menu"], [class*="menu"]');
      for (const menu of menuRenderers) {
        const potentialButtons = menu.querySelectorAll('button, yt-icon-button, [role="button"]');
        for (const btn of potentialButtons) {
          if (btn.querySelector('.yt-icon-shape, yt-icon, svg')) {
            console.log('Found potential menu button in menu renderer');
            menuButton = btn;
            break;
          }
        }
        if (menuButton) break;
      }
    }
    
    // Third: Look for specific aria-labels
    if (!menuButton) {
      const allButtons = videoContainer.querySelectorAll('button, yt-icon-button, [role="button"]');
      for (const btn of allButtons) {
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        if (label.includes('action') || label.includes('menu') || label.includes('more')) {
          console.log('Found menu button through aria-label:', label);
          menuButton = btn;
          break;
        }
      }
    }
    
    if (!menuButton) {
      console.log('Could not find the menu button');
      resolve(false);
      return;
    }
    
    // DEBUG: Log the HTML of the menu button for verification
    console.log('Menu button HTML:', menuButton.outerHTML);
    
    // ONLY click the menu button - avoid the video itself
    console.log('Clicking ONLY the menu button');
    menuButton.click();
    
    // Wait longer for the menu to appear to ensure it's fully loaded
    await new Promise(r => setTimeout(r, 2500)); // Extended wait time
    
    // Look for "Add to queue" option in the menu using the exact HTML structure
    console.log('Looking for "Add to queue" option');
    
    // Direct targeting of the "Add to queue" option
    function findAddToQueueOption() {
      // Find all paper-items in the dropdown menu
      const paperItems = document.querySelectorAll('tp-yt-paper-item');
      console.log(`Found ${paperItems.length} paper items`);
      
      // First approach: direct search for the menu item with the exact text
      for (const item of paperItems) {
        const text = item.textContent.trim();
        if (text.includes('Add to queue')) {
          console.log('Found "Add to queue" by text content in paper-item');
          return item;
        }
      }
      
      // Second approach: check specifically inside menu service items
      const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer');
      for (const item of menuItems) {
        const text = item.textContent.trim();
        if (text.includes('Add to queue')) {
          console.log('Found "Add to queue" in menu service item');
          const paperItem = item.querySelector('tp-yt-paper-item');
          if (paperItem) {
            return paperItem;
          }
          return item; // If paper-item not found, return the service item itself
        }
      }
      
      // Third approach: look for the formatted string
      const formattedStrings = document.querySelectorAll('yt-formatted-string');
      for (const str of formattedStrings) {
        if (str.textContent.trim() === 'Add to queue') {
          console.log('Found exact "Add to queue" text');
          // Return the closest clickable ancestor
          return str.closest('tp-yt-paper-item') || 
                 str.closest('ytd-menu-service-item-renderer') || 
                 str.closest('button') || 
                 str.parentElement;
        }
      }
      
      return null;
    }
    
    // Try to find the "Add to queue" option
    const queueOption = findAddToQueueOption();
    
    if (!queueOption) {
      console.log('Could not find the "Add to queue" option');
      
      // Debug: Try to list all text in the popup menu to help diagnose
      console.log('Dumping all visible menu text:');
      const menuPopup = document.querySelector('ytd-menu-popup-renderer, tp-yt-iron-dropdown');
      if (menuPopup) {
        console.log('Popup menu content:', menuPopup.textContent.trim());
      } else {
        console.log('No popup menu found');
      }
      
      // Close the menu by clicking elsewhere
      document.body.click();
      resolve(false);
      return;
    }
    
    // Click the "Add to queue" option WITHOUT multiple clicks - just ONCE
    console.log('Clicking the "Add to queue" option ONCE');
    console.log('Queue option HTML:', queueOption.outerHTML);
    
    // Single click approach
    try {
      queueOption.click();
    } catch (error) {
      console.error('Error clicking:', error);
    }
    
    // Wait a moment to complete the action
    await new Promise(r => setTimeout(r, 1000));
    
    // Report success
    console.log('Successfully added to queue (single click)');
    resolve(true);
  });
} 