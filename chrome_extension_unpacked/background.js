importScripts('config.js');

chrome.action.onClicked.addListener((tab) => {
  console.log("Extension icon clicked");
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: getPageContent
  });
});

function getPageContent() {
  console.log("Getting page content");
  const pageContent = document.body.innerHTML;
  const pageTitle = document.title;
  
  console.log("Sending message to background script");
  chrome.runtime.sendMessage({
    action: "processContent",
    content: pageContent,
    title: pageTitle,
    tabId: chrome.runtime.id
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in background script:", request.action);
  if (request.action === "processContent") {
    // console.log("Content length:", request.content.length);
    console.log(`Attempting to fetch from ${CONFIG.API_URL}/get-gptsm-sentences`);
    fetch(`${CONFIG.API_URL}/get-gptsm-sentences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: request.title,
        content: request.content
      }),
    })
    .then(response => {
      console.log("Response status:", response.status);
      return response.json();
    })
    .then(processedContent => {
    //   console.log("Received response from server, length:", processedContent.length);
      if (processedContent.length === 0) {
        console.error("Received empty response from server");
        return;
      }
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "updateContent",
            content: processedContent?.sentences?.join('<br>')
          });
        }
      });
    })
    .catch((error) => {
      console.error('Fetch error:', error);
    });
  }
  return true;
});