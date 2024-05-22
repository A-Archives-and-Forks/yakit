import React, {useEffect, useRef, useState} from "react"
import {SimpleDetectForm, SimpleDetectFormContentProps, SimpleDetectProps} from "./SimpleDetectType"
import {Checkbox, Form, Progress, Slider} from "antd"
import {ExpandAndRetract, ExpandAndRetractExcessiveState} from "../plugins/operator/expandAndRetract/ExpandAndRetract"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {randomString} from "@/utils/randomUtil"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {failed, warn, yakitNotify} from "@/utils/notification"
import {RecordPortScanRequest, apiCancelSimpleDetect, apiSimpleDetect} from "../securityTool/newPortScan/utils"
import styles from "./SimpleDetect.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import classNames from "classnames"
import {PluginExecuteResult} from "../plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {PortScanExecuteExtraFormValue} from "../securityTool/newPortScan/NewPortScanType"
import {defPortScanExecuteExtraFormValue} from "../securityTool/newPortScan/NewPortScan"
import cloneDeep from "lodash/cloneDeep"
import {YakitFormDraggerContent} from "@/components/yakitUI/YakitForm/YakitForm"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {useStore} from "@/store"
import {
    DownloadOnlinePluginsRequest,
    apiDeleteLocalPluginsByWhere,
    apiFetchQueryYakScriptGroupLocal,
    defaultDeleteLocalPluginsByWhereRequest
} from "../plugins/utils"
import {DownloadOnlinePluginAllResProps} from "../yakitStore/YakitStorePage"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute, YakitRouteToPageInfo} from "@/routes/newRoute"
import emiter from "@/utils/eventBus/eventBus"
import {SliderMarks} from "antd/lib/slider"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {GroupCount} from "../invoker/schema"
import {getLinkPluginConfig} from "../plugins/singlePluginExecution/SinglePluginExecution"
import {PresetPorts} from "../portscan/schema"
import {PluginExecuteProgress} from "../plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitGetOnlinePlugin} from "../mitm/MITMServerHijacking/MITMPluginLocalList"
import {SimpleDetectExtraParam} from "./SimpleDetectExtraParamsDrawer"
import {convertStartBruteParams, defaultBruteExecuteExtraFormValue} from "../securityTool/newBrute/utils"
import {StartBruteParams} from "../brute/BrutePage"
import {OutlineClipboardlistIcon} from "@/assets/icon/outline"
import {SimpleTabInterface} from "../layout/mainOperatorContent/MainOperatorContent"
import {CreateReportContentProps, onCreateReportModal} from "../portscan/CreateReport"
import {v4 as uuidv4} from "uuid"
import {defaultSearch} from "../plugins/builtInData"

const SimpleDetectExtraParamsDrawer = React.lazy(() => import("./SimpleDetectExtraParamsDrawer"))

const {ipcRenderer} = window.require("electron")

const defaultScanDeep = 3

const scanDeepMapPresetPort = {
    3: "fast",
    2: "middle",
    1: "slow"
}

export const SimpleDetect: React.FC<SimpleDetectProps> = React.memo((props) => {
    const {pageId} = props
    // 全局登录状态
    const {userInfo} = useStore()
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    const initSpaceEnginePageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.SimpleDetect, pageId)
        if (currentItem && currentItem.pageName) {
            return currentItem.pageName
        }
        return YakitRouteToPageInfo[YakitRoute.SimpleDetect].label
    })
    const [form] = Form.useForm()
    const [tabName, setTabName] = useState<string>(initSpaceEnginePageInfo())
    /**是否展开/收起 */
    const [isExpand, setIsExpand] = useState<boolean>(true)
    /**是否在执行中 */
    const [isExecuting, setIsExecuting] = useState<boolean>(false)
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")

    /**额外参数弹出框 */
    const [extraParamsVisible, setExtraParamsVisible] = useState<boolean>(false)
    const [extraParamsValue, setExtraParamsValue] = useState<SimpleDetectExtraParam>({
        portScanParam: cloneDeep({
            ...defPortScanExecuteExtraFormValue,
            scanDeep: defaultScanDeep,
            presetPort: scanDeepMapPresetPort[defaultScanDeep],
            Ports: PresetPorts[scanDeepMapPresetPort[defaultScanDeep]],
            HostAliveConcurrent: 200
        }),
        bruteExecuteParam: cloneDeep(defaultBruteExecuteExtraFormValue)
    })
    const [refreshGroup, setRefreshGroup] = useState<boolean>(false)
    const [visibleOnline, setVisibleOnline] = useState<boolean>(false)
    const [removeLoading, setRemoveLoading] = useState<boolean>(false)

    const [runtimeId, setRuntimeId] = useState<string>("")

    const scanDeep = Form.useWatch("scanDeep", form)

    const taskNameRef = useRef<string>("")
    const simpleDetectWrapperRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(simpleDetectWrapperRef)
    const tokenRef = useRef<string>(randomString(40))

    const defaultTabs = useCreation(() => {
        return [
            {tabName: "漏洞与风险", type: "risk"},
            {tabName: "扫描端口列表", type: "port"},
            {tabName: "日志", type: "log"},
            {tabName: "Console", type: "console"}
        ]
    }, [])

    const onEnd = useMemoizedFn(() => {
        simpleDetectStreamEvent.stop()
        setTimeout(() => {
            setIsExecuting(false)
            if (executeStatus !== "error") {
                setExecuteStatus("finished")
            }
        }, 300)
    })

    const [streamInfo, simpleDetectStreamEvent] = useHoldGRPCStream({
        tabs: defaultTabs,
        taskName: "SimpleDetect",
        apiKey: "SimpleDetect",
        token: tokenRef.current,
        onError: () => {
            setExecuteStatus("error")
        },
        onEnd,
        setRuntimeId: (rId) => {
            yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
            setRuntimeId(rId)
        }
    })

    useEffect(() => {
        switch (scanDeep) {
            // 快速
            case 3:
                setExtraParamsValue((v) => ({
                    ...v,
                    portScanParam: {...v.portScanParam, Ports: PresetPorts["fast"], presetPort: ["fast"]}
                }))
                break
            // 适中
            case 2:
                setExtraParamsValue((v) => ({
                    ...v,
                    portScanParam: {...v.portScanParam, Ports: PresetPorts["middle"], presetPort: ["middle"]}
                }))
                break
            // 慢速
            case 1:
                setExtraParamsValue((v) => ({
                    ...v,
                    portScanParam: {...v.portScanParam, Ports: PresetPorts["slow"], presetPort: ["slow"]}
                }))
                break
        }
    }, [scanDeep])

    useEffect(() => {
        if (inViewport) emiter.on("secondMenuTabDataChange", onSetTabName)
        return () => {
            emiter.off("secondMenuTabDataChange", onSetTabName)
        }
    }, [inViewport])
    useEffect(() => {
        const simpleTab: SimpleTabInterface = {
            tabId: pageId,
            status: executeStatus
        }
        emiter.emit("simpleDetectTabEvent", JSON.stringify(simpleTab))
    }, [executeStatus])

    const onSetTabName = useMemoizedFn(() => {
        setTabName(initSpaceEnginePageInfo())
    })

    const onExpand = useMemoizedFn(() => {
        setIsExpand(!isExpand)
    })
    const onStartExecute = useMemoizedFn((value: SimpleDetectForm) => {
        if (value.scanType === "专项扫描" && (value.pluginGroup?.length || 0) === 0) {
            warn("请选择专项扫描项目")
            return
        }
        let taskNameTimeTarget: string = value?.Targets.split(",")[0].split(/\n/)[0] || "漏洞扫描任务"
        const taskName = `${value.scanType}-${taskNameTimeTarget}`
        taskNameRef.current = taskName
        const pluginGroup = value.scanType !== "专项扫描" ? ["基础扫描"] : value.pluginGroup || []
        const linkPluginConfig = getLinkPluginConfig(
            [],
            {
                search: cloneDeep(defaultSearch),
                filters: {
                    plugin_group: pluginGroup.map((ele) => ({value: ele, label: ele, count: 0}))
                }
            },
            true
        )
        let portScanRequestParams: PortScanExecuteExtraFormValue = {
            ...extraParamsValue.portScanParam,
            Mode: "all",
            Proto: ["tcp"],
            EnableBrute: !!value.pluginGroup?.includes("弱口令"),
            LinkPluginConfig: linkPluginConfig,
            Targets: value.Targets,
            SkippedHostAliveScan: !!value.SkippedHostAliveScan,
            TaskName: `${taskName}-${uuidv4()}`
        }
        switch (value.scanDeep) {
            // 快速
            case 3:
                // 指纹并发
                portScanRequestParams.Concurrent = 100
                // SYN 并发
                portScanRequestParams.SynConcurrent = 2000
                portScanRequestParams.ProbeTimeout = 3
                // 指纹详细程度
                portScanRequestParams.ProbeMax = 3
                // portScanRequestParams.Ports = PresetPorts["fast"]
                break
            // 适中
            case 2:
                portScanRequestParams.Concurrent = 80
                portScanRequestParams.SynConcurrent = 1000
                portScanRequestParams.ProbeTimeout = 5
                portScanRequestParams.ProbeMax = 5
                // portScanRequestParams.Ports = PresetPorts["middle"]
                break
            // 慢速
            case 1:
                portScanRequestParams.Concurrent = 50
                portScanRequestParams.SynConcurrent = 1000
                portScanRequestParams.ProbeTimeout = 7
                portScanRequestParams.ProbeMax = 7
                // portScanRequestParams.Ports = PresetPorts["slow"]
                break
            default:
                break
        }
        const newStartBruteParams: StartBruteParams = {
            ...convertStartBruteParams(extraParamsValue.bruteExecuteParam)
        }
        const params: RecordPortScanRequest = {
            StartBruteParams: {
                ...newStartBruteParams
            },
            PortScanRequest: {...portScanRequestParams}
        }
        simpleDetectStreamEvent.reset()
        setExecuteStatus("process")
        setRuntimeId("")
        apiSimpleDetect(params, tokenRef.current).then(() => {
            setIsExecuting(true)
            setIsExpand(false)
            simpleDetectStreamEvent.start()
        })
    })
    const onStopExecute = useMemoizedFn((e) => {
        e.stopPropagation()
        apiCancelSimpleDetect(tokenRef.current).then(() => {
            simpleDetectStreamEvent.stop()
            setIsExecuting(false)
        })
    })
    /**在顶部的执行按钮 */
    const onExecuteInTop = useMemoizedFn((e) => {
        e.stopPropagation()
        form.validateFields()
            .then(onStartExecute)
            .catch(() => {
                setIsExpand(true)
            })
    })
    const openExtraPropsDrawer = useMemoizedFn(() => {
        setExtraParamsValue({
            ...extraParamsValue,
            portScanParam: {
                ...extraParamsValue.portScanParam,
                SkippedHostAliveScan: form.getFieldValue("SkippedHostAliveScan")
            }
        })
        setExtraParamsVisible(true)
    })
    /**保存额外参数 */
    const onSaveExtraParams = useMemoizedFn((v: SimpleDetectExtraParam) => {
        setExtraParamsValue({...v} as SimpleDetectExtraParam)
        setExtraParamsVisible(false)
        form.setFieldsValue({
            SkippedHostAliveScan: !!v.portScanParam?.SkippedHostAliveScan
        })
    })
    const onImportPlugin = useMemoizedFn((e) => {
        e.stopPropagation()
        if (!userInfo.isLogin) {
            warn("插件需要先登录才能下载，请先登录")
            return
        }
        setVisibleOnline(true)
    })
    const onRemoveAllLocalPlugin = useMemoizedFn((e) => {
        e.stopPropagation()
        setRemoveLoading(true)
        apiDeleteLocalPluginsByWhere(defaultDeleteLocalPluginsByWhereRequest)
            .then(() => {
                setRefreshGroup(!refreshGroup)
            })
            .finally(() =>
                setTimeout(() => {
                    setRemoveLoading(false)
                }, 200)
            )
    })
    /**生成报告 */
    const onCreateReport = useMemoizedFn((e) => {
        e.stopPropagation()
        if (executeStatus === "default") return
        const params: CreateReportContentProps = {
            reportName: taskNameRef.current,
            runtimeId
        }
        onCreateReportModal(params)
    })
    const isShowResult = useCreation(() => {
        return isExecuting || runtimeId
    }, [isExecuting, runtimeId])
    const progressList = useCreation(() => {
        return streamInfo.progressState || []
    }, [streamInfo])
    const disabledReport = useCreation(() => {
        switch (executeStatus) {
            case "finished":
                return false
            case "error":
                return false
            default:
                return true
        }
    }, [executeStatus])
    return (
        <>
            <div className={styles["simple-detect-wrapper"]} ref={simpleDetectWrapperRef}>
                <ExpandAndRetract
                    className={styles["simple-detect-heard"]}
                    onExpand={onExpand}
                    isExpand={isExpand}
                    status={executeStatus}
                >
                    <span className={styles["simple-detect-heard-tabName"]}>{tabName}</span>
                    <div className={styles["simple-detect-heard-operate"]}>
                        {progressList.length === 1 && (
                            <PluginExecuteProgress percent={progressList[0].progress} name={progressList[0].id} />
                        )}
                        {!isExecuting ? (
                            <>
                                <YakitPopconfirm
                                    title={"确定将插件商店所有数据导入到本地吗?"}
                                    onConfirm={onImportPlugin}
                                    onCancel={(e) => {
                                        if (e) e.stopPropagation()
                                    }}
                                    okText='Yes'
                                    cancelText='No'
                                    placement={"left"}
                                >
                                    <YakitButton
                                        type='text'
                                        onClick={(e) => {
                                            e.stopPropagation()
                                        }}
                                    >
                                        一键导入插件
                                    </YakitButton>
                                </YakitPopconfirm>
                                <YakitPopconfirm
                                    title={"确定将插件商店所有本地数据清除吗?"}
                                    onConfirm={onRemoveAllLocalPlugin}
                                    onCancel={(e) => {
                                        if (e) e.stopPropagation()
                                    }}
                                    okText='Yes'
                                    cancelText='No'
                                    placement={"left"}
                                >
                                    <YakitButton
                                        type='text'
                                        danger
                                        onClick={(e) => {
                                            e.stopPropagation()
                                        }}
                                        loading={removeLoading}
                                    >
                                        一键清除插件
                                    </YakitButton>
                                </YakitPopconfirm>
                            </>
                        ) : null}
                        {/* TODO - 任务列表 */}
                        <YakitButton
                            type='text'
                            onClick={(e) => {
                                e.stopPropagation()
                            }}
                            disabled={true}
                        >
                            任务列表
                        </YakitButton>
                        <div className={styles["divider-style"]}></div>
                        <YakitButton
                            icon={<OutlineClipboardlistIcon />}
                            disabled={disabledReport}
                            onClick={onCreateReport}
                            style={{marginRight: 8}}
                        >
                            生成报告
                        </YakitButton>
                        {isExecuting
                            ? !isExpand && (
                                  <>
                                      <YakitButton danger onClick={onStopExecute}>
                                          停止
                                      </YakitButton>
                                  </>
                              )
                            : !isExpand && (
                                  <>
                                      <YakitButton onClick={onExecuteInTop}>执行</YakitButton>
                                  </>
                              )}
                    </div>
                </ExpandAndRetract>
                <div className={styles["simple-detect-content"]}>
                    <div
                        className={classNames(styles["simple-detect-form-wrapper"], {
                            [styles["simple-detect-form-wrapper-hidden"]]: !isExpand
                        })}
                    >
                        <Form
                            form={form}
                            onFinish={onStartExecute}
                            labelCol={{span: 6}}
                            wrapperCol={{span: 12}} //这样设置是为了让输入框居中
                            validateMessages={{
                                /* eslint-disable no-template-curly-in-string */
                                required: "${label} 是必填字段"
                            }}
                            labelWrap={true}
                        >
                            <SimpleDetectFormContent
                                disabled={isExecuting}
                                inViewport={inViewport}
                                form={form}
                                refreshGroup={refreshGroup}
                            />
                            <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                                <div className={styles["simple-detect-form-operate"]}>
                                    {isExecuting ? (
                                        <YakitButton danger onClick={onStopExecute} size='large'>
                                            停止
                                        </YakitButton>
                                    ) : (
                                        <YakitButton
                                            className={styles["simple-detect-form-operate-start"]}
                                            htmlType='submit'
                                            size='large'
                                        >
                                            开始执行
                                        </YakitButton>
                                    )}
                                    <YakitButton
                                        type='text'
                                        onClick={openExtraPropsDrawer}
                                        disabled={isExecuting}
                                        size='large'
                                    >
                                        额外参数
                                    </YakitButton>
                                </div>
                            </Form.Item>
                        </Form>
                    </div>
                    {isShowResult && (
                        <PluginExecuteResult streamInfo={streamInfo} runtimeId={runtimeId} loading={isExecuting} />
                    )}
                </div>
            </div>
            <React.Suspense fallback={<div>loading...</div>}>
                <SimpleDetectExtraParamsDrawer
                    extraParamsValue={extraParamsValue}
                    visible={extraParamsVisible}
                    onSave={onSaveExtraParams}
                />
            </React.Suspense>
            {visibleOnline && (
                <YakitGetOnlinePlugin
                    visible={visibleOnline}
                    setVisible={(v) => {
                        setVisibleOnline(v)
                        setRefreshGroup(!refreshGroup)
                    }}
                />
            )}
        </>
    )
})

const ScanTypeOptions = [
    {
        value: "基础扫描",
        label: "基础扫描"
    },
    {
        value: "专项扫描",
        label: "专项扫描"
    }
]
const marks: SliderMarks = {
    1: {
        label: <div>慢速</div>
    },
    2: {
        label: <div>适中</div>
    },
    3: {
        label: <div>快速</div>
    }
}
const SimpleDetectFormContent: React.FC<SimpleDetectFormContentProps> = React.memo((props) => {
    const {disabled, inViewport, form, refreshGroup} = props
    const [groupOptions, setGroupOptions] = useState<string[]>([])
    const scanType = Form.useWatch("scanType", form)
    useEffect(() => {
        if (inViewport) getPluginGroup()
    }, [inViewport, refreshGroup])
    const scanTypeExtra = useCreation(() => {
        let str: string = ""
        switch (scanType) {
            case "基础扫描":
                str = "包含合规检测、小字典弱口令检测与部分漏洞检测"
                break
            case "专项扫描":
                str = "针对不同场景的专项漏洞检测扫描"
                break
        }
        return str
    }, [scanType])
    const getPluginGroup = useMemoizedFn(() => {
        apiFetchQueryYakScriptGroupLocal(false).then((group: GroupCount[]) => {
            const newGroup: string[] = group
                .map((item) => item.Value)
                .filter((item) => item !== "基础扫描")
                .concat("弱口令")
            setGroupOptions([...new Set(newGroup)])
        })
    })
    return (
        <>
            <YakitFormDraggerContent
                formItemProps={{
                    name: "Targets",
                    label: "扫描目标",
                    rules: [{required: true}]
                }}
                accept='.txt,.xlsx,.xls,.csv'
                textareaProps={{
                    placeholder: "域名/主机/IP/IP段均可，逗号分隔或按行分割",
                    rows: 3
                }}
                help='可将TXT、Excel文件拖入框内或'
                disabled={disabled}
            />
            <Form.Item
                label='扫描模式'
                name='scanType'
                initialValue='基础扫描'
                extra={
                    <>
                        {scanTypeExtra}
                        {scanType === "专项扫描" && (
                            <Form.Item noStyle name='pluginGroup' initialValue={["弱口令"]}>
                                <Checkbox.Group className={styles["plugin-group-wrapper"]} disabled={disabled}>
                                    {groupOptions.map((ele) => (
                                        <YakitCheckbox key={ele} value={ele}>
                                            {ele}
                                        </YakitCheckbox>
                                    ))}
                                </Checkbox.Group>
                            </Form.Item>
                        )}
                    </>
                }
            >
                <YakitRadioButtons buttonStyle='solid' options={ScanTypeOptions} disabled={disabled} />
            </Form.Item>
            <Form.Item
                name='scanDeep'
                label='扫描速度'
                extra='扫描速度越慢，扫描结果就越详细，可根据实际情况进行选择'
                initialValue={defaultScanDeep}
            >
                <Slider tipFormatter={null} min={1} max={3} marks={marks} disabled={disabled} />
            </Form.Item>
            <Form.Item label={" "} colon={false}>
                <div className={styles["form-extra"]}>
                    <Form.Item name='SkippedHostAliveScan' valuePropName='checked' noStyle>
                        <YakitCheckbox disabled={disabled}>跳过主机存活检测</YakitCheckbox>
                    </Form.Item>
                </div>
            </Form.Item>
        </>
    )
})

interface DownloadAllPluginProps {
    setDownloadPlugin?: (v: boolean) => void
    onClose?: () => void
}

export const DownloadAllPlugin: React.FC<DownloadAllPluginProps> = (props) => {
    const {setDownloadPlugin, onClose} = props
    // 全局登录状态
    const {userInfo} = useStore()
    // 全部添加进度条
    const [addLoading, setAddLoading] = useState<boolean>(false)
    // 全部添加进度
    const [percent, setPercent] = useState<number>(0)
    const [taskToken, setTaskToken] = useState(randomString(40))
    useEffect(() => {
        if (!taskToken) {
            return
        }
        ipcRenderer.on(`${taskToken}-data`, (_, data: DownloadOnlinePluginAllResProps) => {
            const p = Math.floor(data.Progress * 100)
            setPercent(p)
        })
        ipcRenderer.on(`${taskToken}-end`, () => {
            setTimeout(() => {
                setPercent(0)
                setDownloadPlugin && setDownloadPlugin(false)
                onClose && onClose()
            }, 500)
        })
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {})
        return () => {
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [taskToken])
    const AddAllPlugin = useMemoizedFn(() => {
        if (!userInfo.isLogin) {
            warn("插件需要先登录才能下载，请先登录")
            return
        }
        // 全部添加
        setAddLoading(true)
        setDownloadPlugin && setDownloadPlugin(true)
        const addParams: DownloadOnlinePluginsRequest = {ListType: ""}
        ipcRenderer
            .invoke("DownloadOnlinePlugins", addParams, taskToken)
            .then(() => {})
            .catch((e) => {
                failed(`添加失败:${e}`)
            })
    })
    const StopAllPlugin = () => {
        onClose && onClose()
        setAddLoading(false)
        ipcRenderer.invoke("cancel-DownloadOnlinePlugins", taskToken).catch((e) => {
            failed(`停止添加失败:${e}`)
        })
    }
    return (
        <div className={styles["download-all-plugin-modal"]}>
            {addLoading ? (
                <div>
                    <div>下载进度</div>
                    <div className={styles["filter-opt-progress-modal"]}>
                        <Progress
                            size='small'
                            status={!addLoading && percent !== 0 ? "exception" : undefined}
                            percent={percent}
                        />
                    </div>
                    <div style={{textAlign: "center", marginTop: 10}}>
                        <YakitButton type='primary' onClick={StopAllPlugin}>
                            取消
                        </YakitButton>
                    </div>
                </div>
            ) : (
                <div>
                    <div>检测到本地未下载任何插件，无法进行安全检测，请点击“一键导入”进行插件下载</div>
                    <div style={{textAlign: "center", marginTop: 10}}>
                        <YakitButton type='primary' onClick={AddAllPlugin}>
                            一键导入
                        </YakitButton>
                    </div>
                </div>
            )}
        </div>
    )
}
