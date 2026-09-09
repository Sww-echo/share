import { Y } from "./YBFeedClient"

const uploadClipboardData = (feedName: string, data: Blob, type: string) => {
    const formData = new FormData()
    const filename = type.startsWith("image/") ? "clipboard.png" : "clipboard.txt"
    formData.append("clipboard", data, filename)

    // Let the browser set the multipart boundary. Setting Content-Type to the
    // clipboard MIME type makes the request invalid multipart/form-data.
    return Y.post("/feeds/" + encodeURIComponent(feedName), formData)
}

/**
 * Upload the first supported item from a native paste event.
 *
 * This is intentionally driven by the paste event rather than only by the
 * Clipboard API: mobile browsers allow a user to paste into a textarea over
 * plain HTTP, while navigator.clipboard.read() generally requires HTTPS.
 */
export const PasteToFeed = async (event: ClipboardEvent, feedName: string) => {
    const clipboardData = event.clipboardData
    if (clipboardData === null) {
        return false
    }

    // Prevent the pasted text from being inserted into the mobile helper
    // textarea and stop the document-level handler from uploading twice.
    event.preventDefault()
    event.stopPropagation()

    const items = Array.from(clipboardData.items)
    const imageItem = items.find((item) => item.kind === "file" && item.type.startsWith("image/"))
    if (imageItem) {
        const file = imageItem.getAsFile()
        if (file) {
            await uploadClipboardData(feedName, file, file.type || imageItem.type)
            return true
        }
    }

    const textItem = items.find((item) => item.type === "text/plain")
    if (textItem) {
        const text = clipboardData.getData("text/plain")
        if (text) {
            await uploadClipboardData(feedName, new Blob([text], { type: "text/plain" }), "text/plain")
            return true
        }
    }

    return false
}

/**
 * Read and upload clipboard contents from a user-initiated button click.
 * This complements the native paste event on browsers that expose the async
 * Clipboard API (typically HTTPS or localhost).
 */
export const ReadClipboardToFeed = async (feedName: string) => {
    if (!navigator.clipboard?.read) {
        throw new Error("当前浏览器不支持直接读取剪贴板，请点击输入框后选择“粘贴”")
    }

    const clipboardItems = await navigator.clipboard.read()
    for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith("image/"))
        if (imageType) {
            await uploadClipboardData(feedName, await item.getType(imageType), imageType)
            return true
        }

        if (item.types.includes("text/plain")) {
            const textBlob = await item.getType("text/plain")
            if ((await textBlob.text()).length > 0) {
                await uploadClipboardData(feedName, textBlob, "text/plain")
                return true
            }
        }
    }

    return false
}
