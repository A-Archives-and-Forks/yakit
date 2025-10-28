import {ReactNode} from "react"
import {AIAgentSetting, AIAgentTab} from "./aiAgentType"
import {
    OutlineChipIcon,
    OutlineCogIcon,
    OutlineMCPIcon,
    OutlineSparklesIcon,
    OutlineTemplateIcon,
    OutlineWrenchIcon
} from "@/assets/icon/outline"
import {YakitSideTabProps} from "@/components/yakitSideTab/YakitSideTabType"
import {genDefaultPagination, PaginationSchema} from "../invoker/schema"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {
    ChatGLMIcon,
    ComateIcon,
    DeepSeekIcon,
    GeminiIcon,
    MoonshotIcon,
    OllamaIcon,
    OpenAIIcon,
    OpenRouterIcon,
    SiliconFlowIcon,
    TongyiIcon,
    YakIcon
} from "./aiModelList/icon"
import {UseAIPerfDataState, UseChatIPCState} from "../ai-re-act/hooks/type"
import {AIAgentGrpcApi} from "../ai-re-act/hooks/grpcApi"
import {
    SolidCursorclickIcon,
    SolidHashtagIcon,
    SolidLightbulbIcon,
    SolidLightningboltIcon,
    SolidToolIcon
} from "@/assets/icon/solid"
import {MCPServerType} from "./type/aiMCP"

/** AI-Agent 页面的唯一 id */
export const YakitAIAgentPageID = "yakit-ai-agent"

export enum AIAgentTabListEnum {
    History = "history",
    Setting = "setting",
    Forge_Name = "forgeName",
    Tool = "tool",
    AI_Model = "AIModel",
    MCP = "mcp"
}
export const AIAgentTabList: YakitSideTabProps["yakitTabs"] = [
    {value: AIAgentTabListEnum.History, label: "历史会话", icon: <OutlineSparklesIcon />},
    {value: AIAgentTabListEnum.Setting, label: "配置", icon: <OutlineCogIcon />},
    {value: AIAgentTabListEnum.Forge_Name, label: "模板", icon: <OutlineTemplateIcon />},
    {value: AIAgentTabListEnum.Tool, label: "工具", icon: <OutlineWrenchIcon />},
    {value: AIAgentTabListEnum.AI_Model, label: "AI模型", icon: <OutlineChipIcon />},
    {value: AIAgentTabListEnum.MCP, label: "MCP", icon: <OutlineMCPIcon />}
]

/** ai-agent 聊天全局配置参数默认值 */
export const AIAgentSettingDefault: AIAgentSetting = {
    EnableSystemFileSystemOperator: true,
    UseDefaultAIConfig: true,
    ForgeName: "",
    DisallowRequireForUserPrompt: true,
    ReviewPolicy: "manual",
    AIReviewRiskControlScore: 0.5,
    DisableToolUse: false,
    AICallAutoRetry: 3,
    AITransactionRetry: 5,
    EnableAISearchTool: true,
    EnableAISearchInternet: true,
    EnableQwenNoThinkMode: true,
    AllowPlanUserInteract: true,
    PlanUserInteractMaxCount: 3,
    AIService: "",
    ReActMaxIteration: 100,
    TimelineItemLimit: 100,
    TimelineContentSizeLimit: 20 * 1024,
    UserInteractLimit: 0,
    TimelineSessionID: "default"
}

/** mcp 自定义服务器配置类型选项 */
export const MCPTransportTypeList: {value: MCPServerType; label: string}[] = [
    {label: "SSE", value: "sse"},
    {label: "STDIO", value: "stdio"}
]

/**
 * @name 生成一个[AIAgentGrpcApi.PlanTask]任务信息
 * @description 生成的信息内不存在subtasks字段值
 */
export const generateTaskChatExecution: (info?: AIAgentGrpcApi.PlanTask) => AIAgentGrpcApi.PlanTask = (info) => {
    let data: AIAgentGrpcApi.PlanTask = {
        index: "",
        name: "",
        goal: "",
        progress: "wait",
        isRemove: false,
        tools: [],
        description: "",
        total_tool_call_count: 0,
        success_tool_call_count: 0,
        fail_tool_call_count: 0,
        summary: ""
    }
    if (!!info) {
        data.index = info.index || ""
        data.name = info.name || ""
        data.goal = info.goal || ""
        data.progress = info.progress || "wait"
        data.isRemove = info.isRemove || false
        data.tools = info.tools || []
        data.description = info.description || ""
        data.total_tool_call_count = info.total_tool_call_count || 0
        data.success_tool_call_count = info.success_tool_call_count || 0
        data.fail_tool_call_count = info.fail_tool_call_count || 0
        data.summary = info.summary || ""
    }

    return data
}

export enum AITabsEnum {
    Task_Content = "task-content",
    File_System = "file-system",
    HTTP = "http",
    Risk = "risk"
}
/** @name AI 默认展示的tab集合 */
export const AITabs: YakitSideTabProps["yakitTabs"] = [
    {label: "任务内容", value: AITabsEnum.Task_Content},
    {label: "更新文件系统", value: AITabsEnum.File_System},
    {label: "HTTP 流量", value: AITabsEnum.HTTP},
    {label: "漏洞与风险", value: AITabsEnum.Risk}
]

/** AI-Forge 列表查询条件里的页码默认条件 */
export const AIForgeListDefaultPagination: PaginationSchema = {
    ...genDefaultPagination(20),
    OrderBy: "id"
}

export const tagColors: YakitTagColor[] = [
    "blue",
    "bluePurple",
    "cyan",
    "green",
    "info",
    "purple",
    "success",
    "warning",
    "yellow"
]

export const AIOnlineModelIconMap: Record<string, ReactNode> = {
    openai: <OpenAIIcon />,
    chatglm: <ChatGLMIcon />,
    moonshot: <MoonshotIcon />,
    tongyi: <TongyiIcon />,
    comate: <ComateIcon />,
    deepseek: <DeepSeekIcon />,
    siliconflow: <SiliconFlowIcon />,
    ollama: <OllamaIcon />,
    openrouter: <OpenRouterIcon />,
    gemini: <GeminiIcon />,
    "yaklang-writer": <YakIcon />,
    "yaklang-rag": <YakIcon />,
    "yaklang-com-search": <YakIcon />,
    "yakit-plugin-search": <YakIcon />,
    aibalance: <YakIcon />
}

export enum AILocalModelTypeEnum {
    AIChat = "aichat",
    Embedding = "embedding",
    SpeechToText = "speech-to-text"
}

export const AIReviewRuleOptions = [
    {
        value: "manual",
        label: "Manual",
        describe: "所有审阅都由用户自己操作"
    },
    {
        value: "yolo",
        label: "Yolo",
        describe: "所有审阅默认执行，不进行询问"
    },
    {
        value: "ai",
        label: "AI",
        describe: "由AI判断审阅风险，低风险默认执行，高风险由用户操作"
    }
]
export enum AIMCPServerTypeEnum {
    SSE = "sse",
    Stdio = "stdio"
}
//#region ai hooks 默认值
export const defaultChatIPCData: UseChatIPCState = {
    execute: false,
    aiPerfData: {
        consumption: {},
        pressure: [],
        firstCost: [],
        totalCost: []
    },
    logs: [],
    casualChat: {
        contents: [],
        coordinatorId: ""
    },
    yakExecResult: {
        card: [],
        execFileRecord: new Map(),
        yakExecResultLogs: []
    },
    taskChat: {
        coordinatorId: "",
        plan: [],
        streams: []
    }
}
export const defaultAIPerfData: UseAIPerfDataState = {
    consumption: {},
    pressure: [],
    firstCost: [],
    totalCost: []
}
//#endregion

/** @name 任务回答类型对应图标 */
export const taskAnswerToIconMap: Record<string, ReactNode> = {
    plan: <SolidLightbulbIcon />,
    execute: <SolidLightningboltIcon />,
    summary: <SolidHashtagIcon />,
    "call-tools": <SolidToolIcon />,
    decision: <SolidCursorclickIcon />
}
