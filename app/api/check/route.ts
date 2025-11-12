import { CHECK_ERROR, UNKNOWN_ERROR, URL_ERROR } from "@/lib/messages";
import { OpenAi4o } from "@/lib/models";
import { MarkdownInfo } from "@/lib/schema";
import { COMPONENT_ANALYZE_TEMPLATE, GRAPH_ANALYZE_TEMPLATE, MODULE_ANALYZE_TEMPLATE, NODE_ANALYZE_TEMPLATE, SERVICE_ANALYZE_TEMPLATE, TYPE_ANALYZE_TEMPLATE } from "@/lib/template";
import { messageText } from "@/lib/utils";
import { toUIMessageStream } from "@ai-sdk/langchain";
import { PromptTemplate } from "@langchain/core/prompts";
import { createUIMessageStreamResponse, UIMessage } from "ai";
import { readFileSync } from "fs";

export const SCENARIO_PATH = "public/markdowns/";
export const MARKDOWN_READ_API = "/api/markdown/read";

export const FILE_PATH = "public/files/"

export async function POST(req: Request) {
  try {
    // チャットデータの取得
    const body = await req.json();
    // フロントから今までのメッセージを取得
    const messages: UIMessage[] = body.messages ?? [];

    

    // urlの取得
    const url = new URL(req.url);
    if (!url) {
      throw new Error(URL_ERROR);
    }

    //現在の履歴 {input}用
    const currentMessage = messages[messages.length - 1];
    const file = messageText(currentMessage);
    
    // 問題内容の取得
    const dir = FILE_PATH;
    const text = readFileSync(`${dir}${file}`, 'utf8');

    console.log(text)

    /* === === LLM === === */
    console.log("ファイル解析中...");
    // プロンプトの取得
    const template = COMPONENT_ANALYZE_TEMPLATE;
    // const template = MODULE_ANALYZE_TEMPLATE;
    // const template =  SERVICE_ANALYZE_TEMPLATE;
    // const template = GRAPH_ANALYZE_TEMPLATE;
    // const template = NODE_ANALYZE_TEMPLATE;
    // const template = TYPE_ANALYZE_TEMPLATE;
    
    const prompt = PromptTemplate.fromTemplate(template);
    const promptVariables = {
      fileName: file,
      code: text,
    };
    // LLM 応答
    const chain = prompt.pipe(OpenAi4o);
    const lcStream = await chain.stream(promptVariables);

    const response = createUIMessageStreamResponse({
      stream: toUIMessageStream(lcStream),
    });

    console.log("ファイル解析完了 !");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error(`${CHECK_ERROR}: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
}
