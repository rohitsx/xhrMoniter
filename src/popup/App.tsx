import React, { useCallback, useEffect, useState, useRef } from "react";

function App() {
  const [url, setUrl] = useState("");
  const [urlList, setUrlList] = useState<string[]>([]);
  const [newUrlIndex, setNewUrlIndex] = useState(-1);
  const [isTracking, setIsTracking] = useState(false);
  const urlContainerRef = useRef<HTMLDivElement>(null);

  // Check initial tracking state when popup opens
  useEffect(() => {
    // Load tracking state from localStorage
    const savedTracking = localStorage.getItem("isTracking") === "true";
    setIsTracking(savedTracking);

    // Load saved URLs
    const savedUrls = localStorage.getItem("capturedUrls");
    if (savedUrls) {
      try {
        const parsedUrls = JSON.parse(savedUrls);
        if (Array.isArray(parsedUrls)) {
          setUrlList(parsedUrls);
        }
      } catch (e) {
        console.error("Error parsing saved URLs:", e);
      }
    }
  }, []);

  const startTracking = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // Format URL for the background script - empty becomes "<all_urls>"
      const urlToTrack = url.trim().length === 0 ? "<all_urls>" : url.trim();

      // Send message to start tracking
      chrome.runtime.sendMessage({
        url: urlToTrack,
        tracking: true,
      });

      // Save state to localStorage
      localStorage.setItem("isTracking", "true");
      localStorage.setItem("trackingUrl", urlToTrack);

      setIsTracking(true);
      setUrl("");
    },
    [url],
  );

  const stopTracking = useCallback(() => {
    // Send explicit stop message
    chrome.runtime.sendMessage({
      action: "stopTracking",
      tracking: false,
    });

    // Update localStorage
    localStorage.setItem("isTracking", "false");
    localStorage.setItem("trackingUrl", "");

    setIsTracking(false);
  }, []);

  // Listen for new URLs
  useEffect(() => {
    const handleMessage = (message: any) => {
      // Only process URL messages, not control messages
      if (
        message &&
        message.url &&
        typeof message.url === "string" &&
        !message.action
      ) {
        setUrlList((prevList) => {
          const newList = [...prevList, message.url];

          // Store in localStorage for persistence
          localStorage.setItem("capturedUrls", JSON.stringify(newList));

          setNewUrlIndex(newList.length - 1);
          setTimeout(() => setNewUrlIndex(-1), 1000);
          return newList;
        });
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  // Auto-scroll to bottom when new URLs arrive
  useEffect(() => {
    if (urlContainerRef.current) {
      urlContainerRef.current.scrollTop = urlContainerRef.current.scrollHeight;
    }
  }, [urlList.length]);

  const downloadUrls = () => {
    const postmanCollection = {
      info: {
        name: "XHR Requests Collection",
        schema:
          "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: urlList.map((url, index) => ({
        name: `Request ${index + 1}`,
        request: {
          method: "GET",
          url: url,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(postmanCollection, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "xhr_requests_collection.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearUrls = () => {
    setUrlList([]);
    localStorage.setItem("capturedUrls", JSON.stringify([]));
  };

  return (
    <div className="bg-gray-100 p-2 main">
      <div className="max-w-xl mx-auto bg-white rounded shadow-sm p-3">
        <h1 className="text-lg font-bold text-gray-800 mb-2">XHR Monitor</h1>

        {/* Tracking Status */}
        <div className="mb-2 text-xs">
          Status:{" "}
          {isTracking ? (
            <span className="text-green-600 font-semibold">
              Tracking Active
            </span>
          ) : (
            <span className="text-gray-600">Idle</span>
          )}
        </div>

        {/* URL Input Form - Inline form */}
        <form onSubmit={startTracking} className="mb-2 flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL filter (empty for all URLs)"
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={isTracking}
          />
          {isTracking ? (
            <button
              type="button"
              onClick={stopTracking}
              className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none"
            >
              Track
            </button>
          )}
        </form>

        {/* URL List Container */}
        <div
          ref={urlContainerRef}
          className="bg-gray-50 border border-gray-200 rounded p-2 mb-2 h-40 overflow-y-auto text-sm"
        >
          {urlList.length === 0 ? (
            <p className="text-gray-500 text-center text-xs">
              No XHR requests captured
            </p>
          ) : (
            urlList.map((url, index) => (
              <div
                key={index}
                className={`p-1.5 mb-1 border-l-3 rounded shadow-sm break-all text-xs
                  ${
                    index === newUrlIndex
                      ? "border-blue-500 bg-blue-50 animate-pulse"
                      : "border-gray-300 bg-white"
                  }`}
              >
                {url}
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={downloadUrls}
            disabled={urlList.length === 0}
            className={`flex-1 px-2 py-1 text-sm font-medium rounded focus:outline-none
              ${
                urlList.length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
          >
            Download for Postman
          </button>

          <button
            onClick={clearUrls}
            disabled={urlList.length === 0}
            className={`px-2 py-1 text-sm font-medium rounded focus:outline-none
              ${
                urlList.length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gray-600 text-white hover:bg-gray-700"
              }`}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
