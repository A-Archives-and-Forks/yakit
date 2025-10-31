import {AIAgentSetting} from "./aiAgentType"
import isNil from "lodash/isNil"
import {AIAgentSettingDefault} from "./defaultConstant"
import {AIAgentGrpcApi} from "../ai-re-act/hooks/grpcApi"

/**
 * @name 将一维tree转换成树结构
 */
/**
 * 将扁平数组转换为树形结构
 * @param {AIAgentGrpcApi.PlanTask[]} items 扁平数据数组
 * @returns {AIAgentGrpcApi.PlanTask[]} 树形结构数组
 */
export const reviewListToTrees = (items: AIAgentGrpcApi.PlanTask[]): AIAgentGrpcApi.PlanTask[] => {
    // 创建映射表，以id为键存储所有节点
    const map = {}
    const tree: AIAgentGrpcApi.PlanTask[] = []

    // 首先构建所有节点的映射
    items.forEach((item) => {
        // 如果是用户添加的节点且没有名称、目标和工具，则跳过
        if (item.isUserAdd && !item.name && !item.goal && !item.tools.length) return
        // 创建节点副本并初始化children数组
        map[item.index] = {...item, subtasks: []}
    })

    // 构建树结构
    items.forEach((item) => {
        const node: AIAgentGrpcApi.PlanTask = map[item.index]
        if (!node) return // 如果节点不存在，跳过
        const parentId = getParentId(item.index)
        // 如果有父节点，则添加到父节点的children中
        if (parentId && map[parentId]) {
            map[parentId].subtasks.push(node)
        }
        // 否则作为根节点
        else {
            tree.push(node)
        }
    })

    return tree
}

/**
 * 从节点ID提取父节点ID
 * @param {String} id 当前节点ID
 * @returns {String|null} 父节点ID或null(如果是根节点)
 */
const getParentId = (id) => {
    const parts = id.split("-")
    if (parts.length <= 1) return null
    return parts.slice(0, -1).join("-")
}

// #region chat相关工具
/** @name 将Token转换为K/M等带单位字符 */
export const formatNumberUnits = (num: number) => {
    if (num >= 1048576) {
        return (num / 1048576).toFixed(1) + "M"
    } else if (num >= 1024) {
        return (num / 1024).toFixed(1) + "K"
    } else {
        return num.toString()
    }
}

/** @name 将全局配置信息转换为可以请求的数据结构 */
export const formatAIAgentSetting = (setting: AIAgentSetting): AIAgentSetting => {
    const data: AIAgentSetting = {}

    try {
        if (!isNil(setting?.EnableSystemFileSystemOperator)) {
            data.EnableSystemFileSystemOperator = setting.EnableSystemFileSystemOperator
        }
        if (!isNil(setting?.UseDefaultAIConfig)) {
            data.UseDefaultAIConfig = setting.UseDefaultAIConfig
        }
        if (!!setting?.ForgeName) {
            data.ForgeName = setting.ForgeName || ""
        }
        if (!isNil(setting?.DisallowRequireForUserPrompt)) {
            data.DisallowRequireForUserPrompt = setting.DisallowRequireForUserPrompt
        }

        if (!!setting?.ReviewPolicy) {
            data.ReviewPolicy = setting.ReviewPolicy || "manual"
        } else {
            data.ReviewPolicy = "manual"
        }

        if (!isNil(setting?.AIReviewRiskControlScore)) {
            data.AIReviewRiskControlScore = setting.AIReviewRiskControlScore || 0.5
        }
        if (!isNil(setting?.DisableToolUse)) {
            data.DisableToolUse = setting.DisableToolUse
        }
        if (!isNil(setting?.AICallAutoRetry)) {
            data.AICallAutoRetry = setting.AICallAutoRetry || 3
        }
        if (!isNil(setting?.AITransactionRetry)) {
            data.AITransactionRetry = setting.AITransactionRetry || 5
        }
        if (!isNil(setting?.EnableAISearchTool)) {
            data.EnableAISearchTool = setting.EnableAISearchTool
        }
        if (!isNil(setting?.EnableAISearchInternet)) {
            data.EnableAISearchInternet = setting.EnableAISearchInternet
        }
        if (!isNil(setting?.AllowPlanUserInteract)) {
            data.AllowPlanUserInteract = setting.AllowPlanUserInteract
        }
        if (setting?.AllowPlanUserInteract) {
            if (!isNil(setting?.PlanUserInteractMaxCount)) {
                data.PlanUserInteractMaxCount = setting.PlanUserInteractMaxCount || 3
            } else {
                data.PlanUserInteractMaxCount = 3
            }
        }
        if (!isNil(setting?.AIService)) {
            data.AIService = setting.AIService
        }
        if (!isNil(setting?.ReActMaxIteration)) {
            data.ReActMaxIteration = setting.ReActMaxIteration || AIAgentSettingDefault.ReActMaxIteration
        }
        if (!isNil(setting?.TimelineItemLimit)) {
            data.TimelineItemLimit = setting.TimelineItemLimit || AIAgentSettingDefault.TimelineItemLimit
        }
        if (!isNil(setting?.TimelineContentSizeLimit)) {
            data.TimelineContentSizeLimit =
                setting.TimelineContentSizeLimit || AIAgentSettingDefault.TimelineContentSizeLimit
        }
        if (!isNil(setting?.UserInteractLimit)) {
            data.UserInteractLimit = setting.UserInteractLimit || AIAgentSettingDefault.UserInteractLimit
        }
        if (!isNil(setting?.TimelineSessionID)) {
            data.TimelineSessionID = setting.TimelineSessionID || AIAgentSettingDefault.TimelineSessionID
        }
    } catch (error) {}

    return {...data}
}
// #endregion
