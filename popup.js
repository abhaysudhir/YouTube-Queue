document.addEventListener('DOMContentLoaded', async () => {
  const tabsList = document.getElementById('tabs-list');
  const selectedCount = document.getElementById('selected-count');
  let selectedTabs = new Set();

  // Get all tabs in the current window
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  // Filter for only YouTube tabs
  const youtubeTabs = tabs.filter(tab => 
    tab.url.includes('youtube.com') || tab.url.includes('youtu.be')
  );
  
  if (youtubeTabs.length === 0) {
    tabsList.innerHTML = '<div class="no-tabs">No YouTube tabs found</div>';
    return;
  }
  
  // Create and display tab elements
  youtubeTabs.forEach(tab => {
    const tabElement = document.createElement('div');
    tabElement.className = 'tab-item';
    tabElement.innerHTML = `
      <img src="${tab.favIconUrl || 'chrome://favicon'}" alt="favicon">
      <span>${tab.title}</span>
    `;
    
    // Add click handler for selection
    tabElement.addEventListener('click', () => {
      if (selectedTabs.has(tab.id)) {
        selectedTabs.delete(tab.id);
        tabElement.classList.remove('selected');
      } else {
        selectedTabs.add(tab.id);
        tabElement.classList.add('selected');
      }
      
      // Update the counter
      selectedCount.textContent = selectedTabs.size;
    });
    
    tabsList.appendChild(tabElement);
  });
}); 