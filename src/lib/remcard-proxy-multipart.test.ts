import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { buildRemcardProxyRequestInput } from "./remcard-proxy-bff.ts";
import { NextRequest } from "next/server";
import {
  isMultipartFormDataContentType,
  proxyRemcardRequest,
  readProxyRequestBody,
} from "./remcard-proxy.ts";

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
const PNG_BYTES = readFileSync(path.join(fixtureDir, "fixtures/catalog-upload-8x8.png"));
const PNG_SHA256 = createHash("sha256").update(PNG_BYTES).digest("hex");

type UploadCapture = {
  rawSha256: string | null;
  purpose: string | null;
  fileName: string | null;
  fileMime: string | null;
  fileSha256: string | null;
  contentType: string | null;
};

const uploadCapture: UploadCapture = {
  rawSha256: null,
  purpose: null,
  fileName: null,
  fileMime: null,
  fileSha256: null,
  contentType: null,
};

let uploadStubBaseUrl = "";

const uploadStub = createServer(async (request, response) => {
  if (request.url !== "/api/upload" || request.method !== "POST") {
    response.writeHead(404);
    response.end();
    return;
  }

  uploadCapture.contentType = request.headers["content-type"] ?? null;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks);
  uploadCapture.rawSha256 = createHash("sha256").update(raw).digest("hex");

  const parsed = new Request("http://stub.local/api/upload", {
    method: "POST",
    headers: { "content-type": uploadCapture.contentType ?? "" },
    body: raw,
  });
  const form = await parsed.formData();
  uploadCapture.purpose = String(form.get("purpose") ?? "");
  const file = form.get("file");
  if (file instanceof File) {
    uploadCapture.fileName = file.name;
    uploadCapture.fileMime = file.type;
    const fileBuf = Buffer.from(await file.arrayBuffer());
    uploadCapture.fileSha256 = createHash("sha256").update(fileBuf).digest("hex");
  }

  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ url: "https://cdn.example/catalog/test.png" }));
});

function resetCapture() {
  uploadCapture.rawSha256 = null;
  uploadCapture.purpose = null;
  uploadCapture.fileName = null;
  uploadCapture.fileMime = null;
  uploadCapture.fileSha256 = null;
  uploadCapture.contentType = null;
}

async function buildCatalogUploadRequest(): Promise<Request> {
  const formData = new FormData();
  const file = new File([PNG_BYTES], "catalog-step.png", { type: "image/png" });
  formData.append("file", file);
  formData.append("purpose", "catalog");
  return new Request("http://localhost:3000/api/remcard/api/upload", {
    method: "POST",
    body: formData,
  });
}

before(async () => {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  delete process.env.REMCARD_API_BASIC_USER;
  delete process.env.REMCARD_API_BASIC_PASSWORD;
  await new Promise<void>((resolve) => uploadStub.listen(0, "127.0.0.1", resolve));
  const address = uploadStub.address() as AddressInfo;
  uploadStubBaseUrl = `http://127.0.0.1:${address.port}`;
  process.env.REMCARD_API_BASE_URL = uploadStubBaseUrl;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    uploadStub.close((error) => (error ? reject(error) : resolve()));
  });
});

describe("multipart catalog upload proxy body", () => {
  it("detects multipart content-type", () => {
    assert.equal(isMultipartFormDataContentType("multipart/form-data; boundary=----abc"), true);
    assert.equal(isMultipartFormDataContentType("application/json"), false);
  });

  it("regression: request.text() corrupts multipart PNG bytes", async () => {
    const source = await buildCatalogUploadRequest();
    const contentType = source.headers.get("content-type") ?? "";
    const intactBody = Buffer.from(await source.clone().arrayBuffer());
    const viaTextBody = Buffer.from(await source.text(), "utf8");
    assert.notEqual(intactBody.length, viaTextBody.length);

    async function fileShaFromBody(body: Buffer): Promise<string> {
      const req = new Request("http://local/upload", {
        method: "POST",
        headers: { "content-type": contentType },
        body,
      });
      const file = (await req.formData()).get("file");
      assert.ok(file instanceof File);
      return createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex");
    }

    assert.equal(await fileShaFromBody(intactBody), PNG_SHA256);
    assert.notEqual(await fileShaFromBody(viaTextBody), PNG_SHA256);
  });

  it("readProxyRequestBody preserves multipart bytes (not text path)", async () => {
    const source = await buildCatalogUploadRequest();
    const contentType = source.headers.get("content-type");
    const binary = await readProxyRequestBody(source.method, contentType, source);
    assert.ok(binary.bodyBinary);
    assert.equal(binary.bodyText, undefined);
    const sha = createHash("sha256").update(Buffer.from(binary.bodyBinary!)).digest("hex");
    assert.notEqual(sha, PNG_SHA256);
    const reparsed = new Request("http://local/upload", {
      method: "POST",
      headers: { "content-type": contentType ?? "" },
      body: binary.bodyBinary,
    });
    const file = (await reparsed.formData()).get("file");
    assert.ok(file instanceof File);
    const fileSha = createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex");
    assert.equal(fileSha, PNG_SHA256);
  });

  it("proxies catalog upload through BFF input builder and upstream stub", async () => {
    resetCapture();
    const source = await buildCatalogUploadRequest();
    const nextReq = new NextRequest(source.url, source);
    const input = await buildRemcardProxyRequestInput(nextReq, ["api", "upload"]);
    assert.ok(input);
    assert.ok(input.bodyBinary);
    assert.equal(input.bodyText, undefined);
    assert.match(input.contentType ?? "", /^multipart\/form-data; boundary=/);

    const result = await proxyRemcardRequest({
      ...input,
      origin: "http://localhost:3000",
      cookieHeader: "remcard-token=synthetic",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.status, 200);
    assert.equal(uploadCapture.purpose, "catalog");
    assert.equal(uploadCapture.fileName, "catalog-step.png");
    assert.equal(uploadCapture.fileMime, "image/png");
    assert.equal(uploadCapture.fileSha256, PNG_SHA256);
    assert.match(uploadCapture.contentType ?? "", /boundary=/);
  });

  it("text-only proxy path would break catalog PNG (documented failure mode)", async () => {
    resetCapture();
    const source = await buildCatalogUploadRequest();
    const corruptedText = await source.text();
    const result = await proxyRemcardRequest({
      method: "POST",
      pathname: "/api/upload",
      search: "",
      contentType: source.headers.get("content-type"),
      cookieHeader: "remcard-token=synthetic",
      origin: "http://localhost:3000",
      csrfHeader: null,
      bodyText: corruptedText,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.notEqual(uploadCapture.fileSha256, PNG_SHA256);
  });
});
