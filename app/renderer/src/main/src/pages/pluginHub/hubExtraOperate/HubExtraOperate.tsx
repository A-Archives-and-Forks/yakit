import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useCreation, useDebounceFn, useMemoizedFn} from "ahooks"
import {
    OutlineClouddownloadIcon,
    OutlineClouduploadIcon,
    OutlineDotshorizontalIcon,
    OutlineLockopenIcon,
    OutlinePencilaltIcon,
    OutlineShareIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {FuncFilterPopover} from "@/pages/plugins/funcTemplate"
import {API} from "@/services/swagger/resposeType"
import {YakScript} from "@/pages/invoker/schema"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {apiDownloadPluginOther} from "@/pages/plugins/utils"
import {yakitNotify} from "@/utils/notification"
import {DelPluginHint, HubButton, HubOperateHint} from "./funcTemplate"

import classNames from "classnames"
import styles from "./HubExtraOperate.module.scss"
import {getRemoteValue} from "@/utils/kv"
import {RemotePluginGV} from "@/enums/remote/plugin"

export interface HubExtraOperateProps {
    /** 上层元素的id */
    getContainer?: string
    online?: API.PluginsDetail
    local?: YakScript
}

export const HubExtraOperate: React.FC<HubExtraOperateProps> = memo((props) => {
    const {getContainer, online, local} = props

    /** ---------- 宽度自适应变化逻辑 Start ---------- */
    const [wrapperWidth, setWrapperWidth] = useState<number>(0)
    const onSetWrapperWidth = useDebounceFn(
        useMemoizedFn((width: number) => {
            setWrapperWidth(width)
        }),
        {wait: 100}
    ).run

    const resizeObserver = useCreation(() => {
        return new ResizeObserver((entries: ResizeObserverEntry[]) => {
            for (let entry of entries) {
                const {id} = (entry.target as HTMLDivElement) || {}
                if (!id) continue
                if (id === getContainer) onSetWrapperWidth(Math.floor(entry.contentRect.width))
            }
        })
    }, [])
    useEffect(() => {
        if (getContainer) {
            const dom = document.getElementById(getContainer)
            if (!!dom) resizeObserver.observe(dom)
        }
        return () => {
            if (getContainer) {
                const dom = document.getElementById(getContainer)
                if (!!dom) resizeObserver.unobserve(dom)
            }
        }
    }, [getContainer])
    /** ---------- 宽度自适应变化逻辑 Start ---------- */

    // 是否线上存在
    const isOnline = useMemo(() => !!online, [online])
    // 是否本地存在
    const isLocal = useMemo(() => !!local, [local])
    // 本地是否存在更新
    const isUpdate = useMemo(() => {
        if (!online || !local) return false
        return Number(online.updated_at || 0) > Number(local.UpdatedAt || 0)
    }, [online, local])

    const menuData = useMemo(() => {
        const isAuth = online ? online.isAuthor : false
        let first: YakitMenuItemType[] = []
        let second: YakitMenuItemType[] = []

        if (isAuth) {
            first.push({
                key: "status",
                label: online?.is_private ? "改为公开" : "改为私密",
                itemIcon: <OutlineLockopenIcon />
            })
            second.push({
                key: "delOnline",
                label: "删除线上",
                itemIcon: <OutlineTrashIcon />,
                type: "danger"
            })
        }

        first = first.concat([
            {
                key: "addMenu",
                label: "添加到菜单栏",
                itemIcon: <OutlineTrashIcon />,
                type: isLocal ? undefined : "info"
            },
            {
                key: "removeMenu",
                label: "移出菜单栏",
                itemIcon: <OutlineTrashIcon />,
                type: isLocal ? undefined : "info"
            },
            {
                key: "export",
                label: "导出",
                itemIcon: <OutlineTrashIcon />,
                type: isLocal ? undefined : "info"
            }
        ])

        if (isLocal) {
            second.push({
                key: "delLocal",
                label: "删除本地",
                itemIcon: <OutlineTrashIcon />,
                type: "danger"
            })
        }

        let menus: YakitMenuItemType[] = [...first]
        if (second.length > 0) menus = [...menus, {type: "divider"}, ...second]

        return menus
    }, [online, isLocal])

    useEffect(() => {
        getRemoteValue(RemotePluginGV.AutoDownloadPlugin)
            .then((res) => {
                if (res === "true") autoDownloadCache.current = true
            })
            .catch(() => {})
        getRemoteValue(RemotePluginGV.DeletePluginHint)
            .then((res) => {
                if (res === "true") delPluginHintCache.current = true
            })
            .catch(() => {})
    }, [])

    /** ---------- 自动下载插件弹框 Start ---------- */
    const autoDownloadCache = useRef<boolean>(false)
    const [autoDownloadHint, setAutoDownloadHint] = useState<boolean>(false)
    const handleAutoDownload = useMemoizedFn(() => {
        if (autoDownloadHint) return
        setAutoDownloadHint(true)
    })
    const autoDownloadCallback = useMemoizedFn((cache: boolean) => {
        autoDownloadCache.current = true
        if (activeOperate.current === "edit") handleEdit()
        if (activeOperate.current === "addMenu") handleAddMenu()
        if (activeOperate.current === "removeMenu") handleRemoveMenu()
        if (activeOperate.current === "export") handleExport()
        setAutoDownloadHint(false)
    })
    /** ---------- 自动下载插件弹框 End ---------- */

    /** ---------- 删除插件的二次确认 Start ---------- */
    const delPluginHintCache = useRef<boolean>(false)
    const [delHint, setDelHint] = useState<boolean>(false)
    const handleDelPlugin = useMemoizedFn(() => {
        if (delHint) return
        setDelHint(true)
    })
    const delHintCallback = useMemoizedFn((flag: boolean, cache: boolean) => {
        if (flag) {
            if (activeOperate.current === "delLocal") handleDelLocal()
            if (activeOperate.current === "delOnline") handleDelOnline()
            delPluginHintCache.current = cache
        } else {
            activeOperate.current = ""
        }
        setDelHint(false)
    })
    /** ---------- 删除插件的二次确认 End ---------- */

    /** ---------- 按钮操作逻辑 Start ---------- */
    const activeOperate = useRef<string>()
    const handleOperates = useMemoizedFn((type: string) => {
        activeOperate.current = type
        // 上传
        if (type === "upload") {
            if (isOnline) {
                yakitNotify("error", "非纯本地插件，暂不支持上传")
                return
            }
            handleUpload()
            return
        }
        // 删除本地
        if (type === "delLocal") {
            if (isLocal) {
                delPluginHintCache.current ? handleDelLocal() : handleDelPlugin()
                return
            } else {
                yakitNotify("error", "本地不存在该插件，无法删除")
                return
            }
        }
        // 删除线上
        if (type === "delOnline") {
            if (online && online.isAuthor) {
                delPluginHintCache.current ? handleDelOnline() : handleDelPlugin()
                return
            } else {
                yakitNotify("error", "无法删除，插件无权限或不存在")
                return
            }
        }
        // 改为公开|私密
        if (type === "status") {
            if (online && online.isAuthor) {
                handleChangePrivate()
                return
            } else {
                yakitNotify("error", "无法更改，插件无权限")
                return
            }
        }
        // 编辑|添加菜单栏|移出菜单栏|导出
        if (["edit", "addMenu", "removeMenu", "export"].includes(type)) {
            if (isLocal) {
                if (autoDownloadCache.current) {
                    if (type === "edit") handleEdit()
                    if (type === "addMenu") handleAddMenu()
                    if (type === "removeMenu") handleRemoveMenu()
                    if (type === "export") handleExport()
                } else {
                    handleAutoDownload()
                }
                return
            } else {
                yakitNotify("error", "本地无此插件，无法操作，请下载后重试")
                return
            }
        }
        // 分享
        if (type === "share") {
            if (isOnline) {
                handleShare()
                return
            } else {
                yakitNotify("error", "无法分享，线上不存在该插件")
                return
            }
        }
        // 下载
        if (type === "download") {
            if (isOnline) {
                handleDownload()
                return
            } else {
                yakitNotify("error", "无法下载/更新，该插件是纯本地插件")
                return
            }
        }
    })

    const onDownload = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            if (!online) {
                reject("")
                return
            }
            yakitNotify("info", "开始下载插件")
            apiDownloadPluginOther({UUID: [online.uuid]}).then((res) => {
                resolve(res)
            })
        })
    })

    // 插件编辑
    const handleEdit = useMemoizedFn(() => {})
    // 插件分享
    const handleShare = useMemoizedFn(() => {})
    // 插件上传
    const handleUpload = useMemoizedFn(() => {})
    // 插件下载|更新
    const handleDownload = useMemoizedFn(() => {})
    // 改为公开|私密
    const handleChangePrivate = useMemoizedFn(() => {})
    const handleAddMenu = useMemoizedFn(() => {})
    const handleRemoveMenu = useMemoizedFn(() => {})
    const handleExport = useMemoizedFn(() => {})

    // 删除线上插件
    const handleDelOnline = useMemoizedFn(() => {})
    // 删除本地插件
    const handleDelLocal = useMemoizedFn(() => {})
    /** ---------- 按钮操作逻辑 End ---------- */

    return (
        <div className={styles["hub-extra-operate"]}>
            <div className={styles["btn-group"]}>
                <HubButton
                    width={wrapperWidth}
                    iconWidth={900}
                    icon={<OutlinePencilaltIcon />}
                    type='text2'
                    name={"编辑"}
                    onClick={() => handleOperates("edit")}
                />
                <div className={styles["divider-style"]}></div>
                <HubButton
                    width={wrapperWidth}
                    iconWidth={900}
                    icon={<OutlineShareIcon />}
                    type='text2'
                    name={"分享"}
                    disabled={!isOnline && isLocal}
                    hint={!isOnline && isLocal ? "请上传后在使用" : ""}
                    onClick={() => handleOperates("share")}
                />
            </div>
            {!isOnline && (
                <HubButton
                    width={wrapperWidth}
                    iconWidth={900}
                    icon={<OutlineClouduploadIcon />}
                    type='outline2'
                    name={"上传"}
                    onClick={() => handleOperates("upload")}
                />
            )}
            <HubButton
                width={wrapperWidth}
                iconWidth={900}
                icon={<OutlineClouddownloadIcon />}
                name={isUpdate ? "更新" : "下载"}
                disabled={!isOnline && isLocal}
                hint={!isOnline && isLocal ? "请上传后在使用" : ""}
                onClick={() => handleOperates("download")}
            />
            <FuncFilterPopover
                icon={<OutlineDotshorizontalIcon />}
                button={{type: "text2"}}
                menu={{
                    type: "primary",
                    data: [...menuData],
                    onClick: ({key}) => handleOperates(key)
                }}
                placement='bottomRight'
            />

            <HubOperateHint visible={autoDownloadHint} onOk={autoDownloadCallback} />
            <DelPluginHint type={activeOperate.current || ""} visible={delHint} onCallback={delHintCallback} />
        </div>
    )
})
