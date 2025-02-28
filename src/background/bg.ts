chrome.runtime.onMessage.addListener((message) => {
  const { url, action } = message;
  const urlInstance = url.split(",");
  const sendDetails = (details: any) => chrome.runtime.sendMessage(details);

  if (action === "stopTracking") {
    chrome.webRequest.onCompleted.removeListener(sendDetails);
    return;
  }

  chrome.webRequest.onCompleted.addListener(sendDetails, { urls: urlInstance });
});
