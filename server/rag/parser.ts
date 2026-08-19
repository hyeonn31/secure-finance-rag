import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

type ParsedResult = { text: string; sections: number; parser: string };

function execute(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd() });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => { stdout += String(data); });
    child.stderr.on("data", (data) => { stderr += String(data); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(stderr || `파서가 종료 코드 ${code}로 종료되었습니다.`)));
  });
}

export async function parseFinanceDocument(buffer: Buffer, fileName: string): Promise<ParsedResult> {
  const extension = path.extname(fileName).toLowerCase().replace(".", "");
  const supported = new Set(["pdf", "docx", "xlsx", "pptx"]);
  if (!supported.has(extension)) throw new Error("PDF, DOCX, XLSX, PPTX 형식만 업로드할 수 있습니다.");
  const tempPath = path.join("/tmp", `secure-rag-${randomUUID()}.${extension}`);
  await fs.writeFile(tempPath, buffer);
  try {
    const scriptPath = path.join(process.cwd(), "scripts", "parse_finance_document.py");
    const { stdout } = await execute("python3", [scriptPath, tempPath]);
    const result = JSON.parse(stdout) as ParsedResult;
    if (!result.text?.trim()) throw new Error("문서에서 추출 가능한 텍스트를 찾지 못했습니다.");
    return result;
  } finally {
    await fs.unlink(tempPath).catch(() => undefined);
  }
}
