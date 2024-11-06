import React, {useEffect, useMemo, useRef, useState} from "react"
import {SinglePluginExecutionProps} from "./SinglePluginExecutionType"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {PluginDetailsTab} from "../local/PluginsLocalDetail"
import {YakScript} from "@/pages/invoker/schema"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePencilaltIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
import {apiGetYakScriptByOnlineID, convertLocalPluginsRequestParams} from "../utils"
import {PluginFilterParams, PluginSearchParams} from "../baseTemplateType"
import cloneDeep from "lodash/cloneDeep"
import "../plugins.scss"
import {yakitNotify} from "@/utils/notification"
import {HybridScanPluginConfig} from "@/models/HybridScan"
import {Tooltip} from "antd"
import {PluginLocalListDetails} from "../operator/PluginLocalListDetails/PluginLocalListDetails"
import {defaultFilter, defaultSearch, pluginTypeToName} from "../builtInData"
import emiter from "@/utils/eventBus/eventBus"
import {grpcFetchLocalPluginDetailByID} from "@/pages/pluginHub/utils/grpc"
import {ModifyYakitPlugin} from "@/pages/pluginEditor/modifyYakitPlugin/ModifyYakitPlugin"
import {ModifyPluginCallback} from "@/pages/pluginEditor/pluginEditor/PluginEditor"

export const getLinkPluginConfig = (selectList, pluginListSearchInfo, allCheck?: boolean) => {
    // allCheck只有为false的时候才走该判断，undefined和true不走
    if (allCheck === false && selectList.length === 0) {
        return undefined
    }
    const {filters, search} = pluginListSearchInfo
    const linkPluginConfig = {
        PluginNames: selectList,
        Filter:
            selectList.length > 0
                ? undefined
                : {
                      ...convertLocalPluginsRequestParams({filter: filters, search})
                  }
    }
    return linkPluginConfig
}

export const SinglePluginExecution: React.FC<SinglePluginExecutionProps> = React.memo((props) => {
    const [yakScriptId, setYakScriptId] = useState<number>(props.yakScriptId)
    const [refreshList, setRefreshList] = useState<boolean>(false)

    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep(defaultFilter))

    const [pluginLoading, setPluginLoading] = useState<boolean>(true)
    const [plugin, setPlugin] = useState<YakScript>()
    const [selectList, setSelectList] = useState<string[]>([])
    const [allCheck, setAllCheck] = useState<boolean>(false)

    const pluginTypeRef = useRef<string>("")
    const singlePluginExecutionRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(singlePluginExecutionRef)

    useEffect(() => {
        getPluginById()
    }, [yakScriptId])
    useEffect(() => {
        if (inViewport) emiter.on("onRefSinglePluginExecution", getYakScriptByOnlineID)
        return () => {
            emiter.off("onRefSinglePluginExecution", getYakScriptByOnlineID)
        }
    }, [inViewport])

    // 下载线上插件后更新本地插件 ID
    const getYakScriptByOnlineID = useMemoizedFn((uuid) => {
        if (!uuid) return
        apiGetYakScriptByOnlineID({UUID: uuid}).then((info) => {
            setYakScriptId(info.Id)
        })
    })
    // 本地刷新
    const onRefresh = useMemoizedFn((e) => {
        e.stopPropagation()
        getPluginById()
    })

    /**获取插件详情，设置插件联动类型，查询私有域,刷新插件列表 */
    const getPluginById = useMemoizedFn(() => {
        setPluginLoading(true)
        grpcFetchLocalPluginDetailByID(yakScriptId, true)
            .then((res) => {
                const {PluginSelectorTypes = ""} = res
                setPlugin(res)
                if (res.Type !== "yak") return
                if (!res.EnablePluginSelector) return
                pluginTypeRef.current = PluginSelectorTypes || ""
                setFilters({
                    ...filters,
                    plugin_type: PluginSelectorTypes
                        ? PluginSelectorTypes.split(",").map((ele) => ({value: ele, label: ele, count: 0}))
                        : []
                })
                setTimeout(() => {
                    setRefreshList(!refreshList)
                }, 200)
            })
            .catch((e) => {
                yakitNotify("error", "获取插件详情失败:" + e)
            })
            .finally(() => {
                setTimeout(() => {
                    setPluginLoading(false)
                }, 200)
            })
    })

    /**插件UI联动相关参数 */
    const linkPluginConfig: HybridScanPluginConfig | undefined = useCreation(() => {
        if (!allCheck && selectList.length === 0) {
            return undefined
        }
        const config = getLinkPluginConfig(selectList, {filters, search}, allCheck)
        return config
    }, [selectList, search, filters, allCheck])
    const hidden = useCreation(() => {
        if (!plugin) return true
        if (plugin.Type !== "yak") return true
        return !plugin.EnablePluginSelector
    }, [plugin])

    const [editHint, setEditHint] = useState<boolean>(false)
    const handleOpenEdit = useMemoizedFn((e) => {
        e.stopPropagation()
        if (!plugin) return
        if (editHint) return
        setEditHint(true)
    })
    const handleEditCallback = useMemoizedFn(async (isSuccess: boolean, data?: ModifyPluginCallback) => {
        if (isSuccess && data) {
            const {opType, info} = data

            if (["save", "saveAndExit", "upload", "submit"].includes(opType)) {
                if (yakScriptId === info.id) getPluginById()
                else setYakScriptId(info.id)
            }

            if (opType === "copy") {
            }

            // 关闭编辑插件弹窗
            if (opType !== "save") {
                setEditHint(false)
            }
        } else {
            setEditHint(false)
        }
    })

    const headExtraNode = useCreation(() => {
        return (
            <>
                <Tooltip title='刷新插件数据'>
                    <YakitButton type='text2' icon={<OutlineRefreshIcon />} onClick={onRefresh} />
                </Tooltip>
                <div className='divider-style' />
                <Tooltip title='编辑'>
                    <YakitButton type='text2' icon={<OutlinePencilaltIcon />} onClick={handleOpenEdit} />
                </Tooltip>
            </>
        )
    }, [])
    const pluginGroupExcludeType = useMemo(() => {
        const typeArr = filters.plugin_type?.map((i) => i.value) || []
        const allPluginTypes = Object.keys(pluginTypeToName)
        return allPluginTypes.filter((type) => !typeArr.includes(type))
    }, [filters])
    if (!plugin) return null
    return (
        <div ref={singlePluginExecutionRef} style={{height: "100%", overflowY: "auto"}}>
            <PluginLocalListDetails
                hidden={hidden}
                selectList={selectList}
                setSelectList={setSelectList}
                search={search}
                setSearch={setSearch}
                filters={filters}
                setFilters={setFilters}
                allCheck={allCheck}
                setAllCheck={setAllCheck}
                pluginGroupExcludeType={pluginGroupExcludeType}
            >
                <PluginDetailsTab
                    executorShow={!pluginLoading}
                    plugin={plugin}
                    headExtraNode={headExtraNode}
                    linkPluginConfig={linkPluginConfig}
                />
            </PluginLocalListDetails>

            {editHint && plugin && (
                <ModifyYakitPlugin
                    getContainer={singlePluginExecutionRef.current || undefined}
                    plugin={plugin}
                    visible={editHint}
                    onCallback={handleEditCallback}
                />
            )}
        </div>
    )
})
