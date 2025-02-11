document.addEventListener('DOMContentLoaded', async () => {
  const tabsList = document.getElementById('tabs-list');
  const selectedCount = document.getElementById('selected-count');
  let selectedTabs = new Set();

  // Get all tabs in the current window
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  // Create and display tab elements
  tabs.forEach(tab => {
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