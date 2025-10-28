import {AIToolResult} from "./aiRender"
import {AIOutputI18n} from "./grpcApi"

export const DefaultAIToolResult: AIToolResult = {
    callToolId: "",
    toolName: "-",
    status: "default",
    summary: "",
    toolStdoutContent: {
        content: "",
        isShowAll: false
    }
}

/** AI 流式输出中, NodeId 对应展示的内容 */
const AIStreamNodeIdToLabel: Record<string, {label: string}> = {
    "re-act-loop": {label: "推理与行动"},// 单行组件 AIStreamChatContent
    "call-forge": {label: "智能应用"},
    "call-tools": {label: "工具调用"},
    review: {label: "审查系统"},
    liteforge: {label: "轻量智能应用"},
    directly_answer: {label: "直接回答"},
    "memory-reducer": {label: "记忆裁剪"},
    "memory-timeline": {label: "记忆浓缩"},
    execute: {label: "执行"},
    summary: {label: "总结"},
    "create-subtasks": {label: "创建子任务"},
    "freedom-plan-review": {label: "计划审查"},
    "dynamic-plan": {label: "动态规划"},
    "re-act-verify": {label: "核实结果"},
    result: {label: "结果输出"},
    plan: {label: "任务规划"},
    decision: {label: "决策"},
    output: {label: "通用输出"},
    forge: {label: "智能应用"},
    "re-act-loop-thought": {label: "思考"},// 单行组件 AIStreamChatContent
    "re-act-loop-answer-payload": {label: "AI 响应"},
    "enhance-query": {label: "知识增强"}
}
/** 传入 NodeId, 输出展示内容的18n 结构 */
export const convertNodeIdToVerbose = (nodeId: string) => {
    const label = AIStreamNodeIdToLabel[nodeId]?.label || nodeId
    const verbose18n: AIOutputI18n = {
        Zh: label,
        En: label
    }
    return verbose18n
}

/** AI 判断 review 的风险阈值等级对应的展示内容 */
export const AIReviewJudgeLevelMap: Record<string, {label: string}> = {
    low: {label: "低风险自动同意"},
    middle: {label: "等待用户否决"},
    high: {label: "需人工确认"}
}

export const CasualDefaultToolResultSummary: Record<string, {label: string}> = {
    failed: {label: "执行失败"},
    success: {label: "执行成功"},
    user_cancelled: {label: "用户取消"}
}

export const TaskDefaultReToolResultSummary: Record<string, {label: string}> = {
    failed: {label: "获取失败原因中..."},
    success: {label: "执行结果正在总结中..."},
    user_cancelled: {label: "工具调用取消中..."}
}
