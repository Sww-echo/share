/*eslint no-restricted-globals: ["error"]*/
self.addEventListener('push', event => {
    const title = 'ShareBox Notification';
    const options = {
      body: event.data.text(),
      icon:"logo192.png",
    };

    event.waitUntil(self.registration.showNotification(title, options));
});
