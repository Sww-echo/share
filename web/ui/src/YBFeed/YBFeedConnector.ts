import { AxiosResponseHeaders } from 'axios'
import { YBFeed, YBFeedItem, YBFeedError } from '.'
import { Y } from '../YBFeedClient'
import { errorStatus, itemURL } from './feedback'

class YBFeedConnector {
    feedUrl(feedName: string): string {
        return "/api/feeds/"+encodeURIComponent(feedName)
    }
    async Ping(): Promise<AxiosResponseHeaders> {
        return new Promise((resolve, reject) => {
            Y.request({
                url: "/api",
                method: 'GET'
            })
            // fetch("/api",{
            //     credentials: "include"
            // })
            .then((f) => {
                if (f) {
                    f.headers.then((h:AxiosResponseHeaders) => {
                        resolve(h)
                    })
                }
            })
            .catch((e)=>reject(e))
        })
    }
    async GetFeed(feedName: string, secret?: string): Promise<YBFeed> {
        try {
            const query = secret ? '?secret=' + encodeURIComponent(secret) : ''
            return await Y.get('/feeds/' + encodeURIComponent(feedName) + query) as YBFeed
        } catch (error) {
            throw new YBFeedError(errorStatus(error) ?? 0, '暂时无法打开空间，请稍后重试。')
        }
    }
    async AuthenticateFeed(feedName: string, secret: string): Promise<string> {
        const feed = await this.GetFeed(feedName, secret)
        if (!feed.secret) throw new YBFeedError(401, 'PIN 不正确或已过期。')
        return feed.secret
    }
    async GetItem(item: YBFeedItem): Promise<string> {
        return Y.request({ url: itemURL(item.feed.name, item.name), method: 'GET', responseType: 'text' })
    }
    async DeleteItem(item: YBFeedItem) {
        return new Promise((resolve, reject) => {
            Y.delete('/feeds/' + encodeURIComponent(item.feed.name) + "/items/" + encodeURIComponent(item.name))
            .then(() => {
                resolve(true)
            })
            .catch((error) => {
                reject(new YBFeedError(error.status, "Error while getting item"))
            })

            // fetch(this.feedUrl(item.feed.name)+"/items/"+encodeURIComponent(item.name),{
            //     method: "DELETE",
            //     credentials: "include"
            // })
            // .then((f) => {
            //     if (f.status !== 200) {
            //         f.text()
            //         .then(text => {
            //             reject(new YBFeedError(f.status, text))
            //         })
            //         .catch(() => {
            //             reject(new YBFeedError(f.status, "Server Unavailable"))
            //         })
            //     } else {
            //         resolve(true)
            //     }
            // })
        })
    }
    async EmptyFeed(feedName: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            Y.delete('/feeds/' + encodeURIComponent(feedName) + "/items")
            .then(() => {
                resolve(true)
            })
            .catch((error) => {
                reject(new YBFeedError(error.status, "Error while deleting item"))
            })

            // fetch(this.feedUrl(feedName)+
            //     "/items",{
            //     method: "DELETE",
            //     credentials: "include"
            // })
            // .then((f) => {
            //     if (f.status !== 200) {
            //         f.text()
            //         .then(text => {
            //             reject(new YBFeedError(f.status, text))
            //         })
            //         .catch(() => {
            //             reject(new YBFeedError(f.status, "Server Unavailable"))
            //         })
            //     } else {
            //         resolve(true)
            //     }
            // })
        })
    }

    async SetPIN(feedName: string, pin: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            Y.patch('/feeds/' + encodeURIComponent(feedName), pin)
            .then(() => {
                resolve(true)
            })
            .catch((error) => {
                reject(new YBFeedError(error.status, "Error while setting PIN"))
            })

            // fetch(this.feedUrl(feedName),{
            //     method: "PATCH",
            //     credentials: "include",
            //     body: pin
            // })
            // .then((f) => {
            //     if (f.status !== 200) {
            //         f.text().then((b) => {
            //             reject(new YBFeedError(f.status, b))
            //         })
            //         .catch(() => {
            //             reject(new YBFeedError(f.status, "Server Unavailable"))
            //         })
            //     }
            //     resolve(true)
            // })
            // .catch((e) => {
            //     reject(new YBFeedError(e.status, "Server Unavailable"))
            // })
        })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async AddSubscription(feedName: string, subscription: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            Y.post('/feeds/' + encodeURIComponent(feedName) + "/subscription", subscription)
            .then(() => {
                resolve(true)
            })
            .catch((error) => {
                reject(new YBFeedError(error.status, "Error while adding subscription"))
            })

            // fetch(this.feedUrl(feedName)+"/subscription",{
            //     method: "POST",
            //     credentials: "include",
            //     body: subscription
            // })
            // .then((f) => {
            //     if (f.status !== 200) {
            //         f.text().then((b) => {
            //             reject(new YBFeedError(f.status, b))
            //         })
            //         .catch(() => {
            //             reject(new YBFeedError(f.status, "Server Unavailable"))
            //         })
            //     }
            //     resolve(true)
            // })
            // .catch((e) => {
            //     reject(new YBFeedError(e.status, "Server Unavailable"))
            // })
        })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async RemoveSubscription(feedName: string, subscription: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            Y.delete('/feeds/' + encodeURIComponent(feedName) + "/subscription", subscription)
            .then(() => {
                resolve(true)
            })
            .catch((error) => {
                reject(new YBFeedError(error.status, "Error while adding subscription"))
            })
            
            // fetch(this.feedUrl(feedName)+"/subscription",{
            //     method: "DELETE",
            //     credentials: "include",
            //     body: subscription
            // })
            // .then((f) => {
            //     if (f.status !== 200) {
            //         f.text().then((b) => {
            //             reject(new YBFeedError(f.status, b))
            //         })
            //         .catch(() => {
            //             reject(new YBFeedError(f.status, "Server Unavailable"))
            //         })
            //     }
            //     resolve(true)
            // })
            // .catch((e) => {
            //     reject(new YBFeedError(e.status, "Server Unavailable"))
            // })
        })
    }

}

export const Connector = new YBFeedConnector()