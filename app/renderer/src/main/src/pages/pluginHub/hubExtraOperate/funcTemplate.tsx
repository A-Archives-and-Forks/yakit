import React, {memo, useMemo, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {YakitButtonProp, YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {Tooltip} from "antd"
import {setRemoteValue} from "@/utils/kv"
import {RemotePluginGV} from "@/enums/remote/plugin"

import styles from "./HubExtraOperate.module.scss"

interface HubButtonProps extends YakitButtonProp {
    name: string
    width?: number
    iconWidth?: number
    hint?: string
}
export const HubButton: React.FC<HubButtonProps> = memo((props) => {
    const {name, width, iconWidth, hint, className, disabled, ...rest} = props

    const isIcon = useMemo(() => {
        if (!width || !iconWidth) return false
        return width <= iconWidth
    }, [width, iconWidth])

    const tooltipHint = useMemo(() => {
        if (disabled) return hint || ""
        if (isIcon) return name || ""
        return ""
    }, [name, hint, disabled, isIcon])

    return (
        <Tooltip overlayClassName='plugins-tooltip' title={tooltipHint}>
            <YakitButton {...rest}>
                <span className={isIcon ? styles["hub-button-hidden"] : ""}>{name}</span>
            </YakitButton>
        </Tooltip>
    )
})

interface HubOperateHintProps {
    visible: boolean
    onOk: (isCache: boolean) => any
}
export const HubOperateHint: React.FC<HubOperateHintProps> = memo((props) => {
    const {visible, onOk} = props

    const [cache, setCache] = useState<boolean>(false)
    const handleOk = useMemoizedFn(() => {
        if (cache) setRemoteValue(RemotePluginGV.AutoDownloadPlugin, `true`)
        onOk(cache)
    })

    return (
        <YakitHint
            visible={visible}
            wrapClassName={styles["hub-operate-hint"]}
            title='该操作为本地功能'
            content={
                <>
                    <span className={styles["operate-style"]}>编辑、添加到菜单栏、移除菜单栏、导出</span>
                    <span className={styles["content-style"]}>均为本地操作，点击后会自动下载插件并进行对应操作</span>
                </>
            }
            okButtonText='好的'
            onOk={handleOk}
            cancelButtonProps={{style: {display: "none"}}}
            footerExtra={
                <YakitCheckbox value={cache} onChange={(e) => setCache(e.target.checked)}>
                    下次不再提醒
                </YakitCheckbox>
            }
        />
    )
})

interface DelPluginHintProps {
    type: string
    visible: boolean
    onCallback: (flag: boolean, isCache: boolean) => any
}
export const DelPluginHint: React.FC<DelPluginHintProps> = memo((props) => {
    const {type, visible, onCallback} = props

    const [cache, setCache] = useState<boolean>(false)
    const handleCallback = useMemoizedFn((flag: boolean) => {
        if (flag && cache) setRemoteValue(RemotePluginGV.DeletePluginHint, `true`)
        onCallback(flag, cache)
    })

    const title = useMemo(() => {
        if (type === "delLocal") return "确认删除后，插件将彻底删除"
        if (type === "delOnline") return "确认删除插件后，插件将会放在回收站"
        return "出现异常，请切换插件详情后重试"
    }, [type])

    return (
        <YakitHint
            visible={visible}
            title='是否要删除插件'
            content={title}
            okButtonProps={{disabled: !["delOnline", "delLocal"].includes(type)}}
            onOk={() => handleCallback(true)}
            onCancel={() => handleCallback(false)}
            footerExtra={
                <YakitCheckbox value={cache} onChange={(e) => setCache(e.target.checked)}>
                    下次不再提醒
                </YakitCheckbox>
            }
        />
    )
})
