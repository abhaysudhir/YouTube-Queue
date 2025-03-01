document.addEventListener('DOMContentLoaded', () => {
  const openVideoButton = document.getElementById('open-video');
  const statusElement = document.getElementById('status');
  
  // The specific YouTube video URL
  const youtubeVideoUrl = 'https://www.youtube.com/watch?v=W1kE3qA8FcA';
  
  // Handle the button click
  openVideoButton.addEventListener('click', async () => {
    try {
      // Disable the button while processing
      openVideoButton.disabled = true;
      statusElement.textContent = 'Opening video...';
      statusElement.className = 'status-message pending';
      
      // Open the YouTube video in a new tab
      const newTab = await chrome.tabs.create({ url: youtubeVideoUrl });
      
      // Update status
      statusElement.textContent = 'Video opened successfully!';
      statusElement.className = 'status-message success';
    } catch (error) {
      // Handle any errors
      statusElement.textContent = 'Error: ' + error.message;
      statusElement.className = 'status-message error';
    } finally {
      // Re-enable the button
      openVideoButton.disabled = false;
    }
  });
}); 