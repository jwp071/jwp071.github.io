window.addEventListener("load", () => {
  const button = document.querySelector("button");

  navigator.serviceWorker.register('sw.js');

  if (window.self !== window.top) {
    // Ensure that if our document is in a frame, we get the user
    // to first open it in its own tab or window. Otherwise, it
    // won't be able to request permission to send notifications.
    button.textContent = "Subscribe to Notifications";
    button.addEventListener("click", () => window.open(location.href));
    return;
  }

  button.addEventListener("click", () => {
    if (Notification?.permission === "granted") {
      // If the user agreed to get notified
      // Let's try to send ten notifications

      // service worker notification
      navigator.serviceWorker.ready.then(function(registration) {
        registration.showNotification('Notification granted with ServiceWorker');
      });
      
      let i = 0;
      // Using an interval cause some browsers (including Firefox) are blocking notifications if there are too much in a certain time.
      const interval = setInterval(() => {
        // Thanks to the tag, we should only see the "Hi! 9" notification
        const n = new Notification(`Hi! ${i}`, { tag: "soManyNotification" });
        if (i === 9) {
          clearInterval(interval);
        }
        i++;
      }, 2000);
    } else if (Notification && Notification.permission !== "denied") {

      // service worker notification
      navigator.serviceWorker.ready.then(function(registration) {
        registration.showNotification('Notification granted third scenario with ServiceWorker');
      });
      // If the user hasn't told if they want to be notified or not
      // Note: because of Chrome, we are not sure the permission property
      // is set, therefore it's unsafe to check for the "default" value.
      Notification.requestPermission().then((status) => {
        // If the user said okay
        if (status === "granted") {

          // service worker notification
          navigator.serviceWorker.ready.then(function(registration) {
            registration.showNotification('Notification granted second scenario with ServiceWorker');
          });
          
          let i = 0;
          // Using an interval cause some browsers (including Firefox) are blocking notifications if there are too much in a certain time.
          const interval = setInterval(() => {
            // Thanks to the tag, we should only see the "Hi! 9" notification
            const n = new Notification(`Hi! ${i}`, {
              tag: "soManyNotification",
            });
            if (i === 9) {
              clearInterval(interval);
            }
            i++;
          }, 4000);
        } else {
          // Otherwise, we can fallback to a regular modal alert
          alert("Hi!");
        }
      });
    } else {
      // service worker notification
      navigator.serviceWorker.ready.then(function(registration) {
        registration.showNotification('Notification granted fifth scenario with ServiceWorker');
      });
      // If the user refuses to get notified, we can fallback to a regular modal alert
      alert("Hi!");
    }
  });
});
