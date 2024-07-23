export type PluginsEventProps = {
    /** 触发编辑插件功能的插件ID */
    sendEditPluginId: string
    /**
     * 新建|编辑插件成功后的发送信号(包含本地和线上保存, 传递数据的定义[SavePluginInfoSignalProps])
     * 该通信已无用，注明废弃，下版删除该通信
     */
    savePluginInfoSignal: string

    /** 刷新本地插件详情页面的选中的插件数据 */
    onRefLocalDetailSelectPlugin: string
    /** 修改私有域成功后发送的信号 */
    onSwitchPrivateDomain: string
    /** 导入刷新本地插件列表 */
    onImportRefLocalPluginList: string
    /**刷新单个执行页面中的插件数据 */
    onRefSinglePluginExecution?: string
    /** 刷新Codec相关菜单 */
    onRefPluginCodecMenu?: string

    // ---------- 插件列表相关通信 ----------
    /** 刷新插件商店列表(传 true 则同步刷新高级筛选条件) */
    onRefreshOnlinePluginList?: boolean
    /** 刷新我的列表(传 true 则同步刷新高级筛选条件) */
    onRefreshOwnPluginList?: boolean
    /** 刷新本地列表(传 true 则同步刷新高级筛选条件) */
    onRefreshLocalPluginList?: boolean

    /** 导入插件后的刷新本地插件列表 */
    onImportRefreshLocalPluginList?: string

    /** 我的插件(包括详情里的删除线上) 删除操作通知 回收站刷新列表 */
    ownDeleteToRecycleList?: string

    /** 打开插件仓库跳转到指定的列表 */
    openPluginHubListAndDetail: string

    // ---------- 插件详情相关通信 ----------
    /** 插件详情删除本地插件 通知本地列表的变量刷新 */
    detailDeleteLocalPlugin: string
    /** 插件详情删除线上插件 通知我的列表的变量刷新 */
    detailDeleteOwnPlugin: string
    /** 插件详情更改公开|私密 通知我的列表里状态更新 */
    detailChangeStatusOwnPlugin: string

    // ---------- 插件(新建|编辑)相关通信 ----------
    /**
     * 插件(新建|编辑)本地保存后通知本地列表更新(更新插件存在进行局部更新，不存在进行刷新列表)
     * 传递数据为对象 JSON, 定义为 KeyParamsFetchPluginDetail
     */
    editorLocalSaveToLocalList: string
    /**
     * 新建插件成功后通知插件仓库定位列表到本地列表，并更新数据(更新插件存在进行局部更新，不存在进行刷新列表)
     * 传递数据为对象 JSON, 定义为 KeyParamsFetchPluginDetail
     */
    editorLocalNewToLocalList: string
}
