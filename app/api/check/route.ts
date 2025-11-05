import { CHECK_ERROR, UNKNOWN_ERROR, URL_ERROR } from "@/lib/messages";
import { OpenAi4o } from "@/lib/models";
import { MarkdownInfo } from "@/lib/schema";
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
    console.log("誤字脱字のチェック中...");
    // プロンプトの取得
    const template = `以下のコンポーネントのコードを読んで、以下の情報をまとめてください。

    ## ROLE
    - コードの内容を正確に把握し、各セクションごとに必要な情報を整理すること
    - 不明確な点があれば、推測せずにそのまま記載すること
    - 各項目に複数の情報がある場合は、箇条書きで整理すること

    ## コード
    <component>
    {component}
    </component>


    ## フォーマット
    【ファイル情報】
    - ディレクトリ: [空欄]
    - ファイル名: {file}
    - ファイル概要:
    - クライアントコンポーネント: [○／×]

    【適応CSSモジュール】
    1. CSSモジュール名: 
    2. ...（以下、CSSモジュールごとに繰り返し）

    【親コンポーネント】
    - 親コンポーネント名:
    - 親コンポーネント概要:

    【子コンポーネント】
    1. 子コンポーネント名:
      - 子コンポーネント概要:
      - Props情報:
    2. ...（以下、子コンポーネントごとに繰り返し）

    【props】
    - props名:
    - props構成:

    【状態管理】
    1. 利用Hooks: 
      - 状態管理概要:
      - 正常処理: 
      - エラー処理:
    2. ...（以下、状態管理ごとに繰り返し）

    【関数・メソッド】
    1. アクセス修飾子: 
      - 関数・メソッド名:
      - 引数: 
      - 戻り値: 
      - 処理概要:
      - 正常処理:
      - エラー処理:
    2. ...（以下、関数・メソッドごとに繰り返し）
    
    【全体処理概要】
    - 正常処理
    - エラー処理
    `;
    const prompt = PromptTemplate.fromTemplate(template);
    const promptVariables = {
      file: file,
      component: text,
    };
    // LLM 応答
    const chain = prompt.pipe(OpenAi4o);
    const lcStream = await chain.stream(promptVariables);

    const response = createUIMessageStreamResponse({
      stream: toUIMessageStream(lcStream),
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error(`${CHECK_ERROR}: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
}
