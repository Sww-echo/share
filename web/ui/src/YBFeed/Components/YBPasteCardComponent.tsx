import { useState, useEffect } from 'react'

import { redirect, useParams } from 'react-router-dom'

import { Textarea, Center, Button, Stack } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';

import './YBPasteCardComponent.css'
import { PasteToFeed, ReadClipboardToFeed } from '../../paste';
import { Y } from '../../YBFeedClient';
import { defaultNotificationProps } from '../config';

interface ServerInfo {
    maxBodySize: number
}
export function YBPasteCardComponent() {
    const [isMobile, setIsMobile] = useState(false)
    const [maxSize, setMaxSize] = useState(5*1024**2)

    const {feedName} = useParams()

    if (!feedName) {
        redirect("/")
        return
    }

    useEffect(() => {
        Y.get("/infos").then(r => {
            const i = r as ServerInfo
            setMaxSize(i.maxBodySize)
        }).catch(e => {
            console.log(e)
        })
    }, [])

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 734); // Adjust the breakpoint as needed
        };
    
        handleResize(); // Initial call to set the initial state
    
        window.addEventListener('resize', handleResize);
    
        return () => {
          window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        const handleDocumentPaste = (event: ClipboardEvent) => {
            // The mobile textarea handles its own event so the upload is not
            // triggered a second time while the event bubbles to document.
            if (event.target instanceof HTMLTextAreaElement && event.target.dataset.ybPasteTarget === "true") {
                return
            }
            void PasteToFeed(event, feedName).catch((error: unknown) => {
                console.error(error)
                notifications.show({ message: "粘贴上传失败", color: "red", ...defaultNotificationProps })
            })
        }

        document.addEventListener("paste", handleDocumentPaste)
        return () => {
            document.removeEventListener("paste", handleDocumentPaste)
        }
    }, [feedName])

    const handleMobilePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        void PasteToFeed(event.nativeEvent, feedName).then((uploaded) => {
            if (uploaded) {
                notifications.show({ message: "已从剪贴板上传", ...defaultNotificationProps })
            }
        }).catch((error: unknown) => {
            console.error(error)
            notifications.show({ message: "粘贴上传失败", color: "red", ...defaultNotificationProps })
        })
    }

    const handleClipboardButton = () => {
        void ReadClipboardToFeed(feedName).then((uploaded) => {
            notifications.show({
                message: uploaded ? "已从剪贴板上传" : "剪贴板中没有可上传的文本或图片",
                color: uploaded ? undefined : "yellow",
                ...defaultNotificationProps,
            })
        }).catch((error: unknown) => {
            const message = error instanceof Error ? error.message : "读取剪贴板失败"
            notifications.show({ message, color: "red", ...defaultNotificationProps })
        })
    }

    return (
        <Center my="2em" h="100%" style={{ flexDirection:"column"}}>
            {isMobile &&
                <Stack w="100%" gap="xs">
                    <Textarea
                        data-yb-paste-target="true"
                        aria-label="粘贴文本或图片"
                        ta="center"
                        autosize
                        minRows={2}
                        maxRows={4}
                        placeholder='点击此处，然后从键盘选择“粘贴”'
                        value={""}
                        onChange={() => {}}
                        onPaste={handleMobilePaste}
                    />
                    <Button variant="light" fullWidth onClick={handleClipboardButton}>
                        从剪贴板上传
                    </Button>
                </Stack>
            }
            <Dropzone.FullScreen w="100%" ta="center"
                onDrop={(files) => {
                    const formData = new FormData();
                    formData.append("file", files[0]);
                    Y.post("/feeds/" + encodeURIComponent(feedName), formData)
                }}
                onReject={(files) => console.log('rejected files', files)}
                maxSize={maxSize}
                ><Center h={"100vh"}>
                    Drop files here
                    </Center>
            </Dropzone.FullScreen>
            
        </Center>
    )
}
