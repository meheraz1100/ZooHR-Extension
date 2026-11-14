chrome.runtime.onInstalled.addListener(() => {
  console.info("ZooHR extension installed.");
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "OPEN_WORKSPACE") {
    chrome.tabs.create({ url: chrome.runtime.getURL("workspace.html") });
    sendResponse({ ok: true });
  }
  return true;
});
