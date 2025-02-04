import { describe, expect, it } from "@jest/globals";
import { mapGeminiPro } from "../../llm-mapper/mappers/gemini/chat";
import { mapAnthropicRequest } from "../../llm-mapper/mappers/anthropic/chat";

describe("mapGeminiPro", () => {
  it("should handle basic text messages", () => {
    const result = mapGeminiPro({
      request: {
        contents: [
          {
            parts: [
              {
                text: "Hello, how are you?",
              },
            ],
            role: "user",
          },
        ],
        generationConfig: {},
      },
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: "I'm doing well, thank you for asking!",
                },
              ],
              role: "model",
            },
          },
        ],
      },
      statusCode: 200,
      model: "gemini-1.5-pro",
    });

    expect(result.schema.request.messages![0]).toEqual({
      role: "user",
      content: "Hello, how are you?",
      _type: "message",
    });

    expect(result.schema.response!.messages![0]).toEqual({
      role: "model",
      content: "I'm doing well, thank you for asking!",
      _type: "message",
    });
  });

  it("should handle image messages", () => {
    const imageData = "iVBORw0KGgoAAAANS...=";
    const result = mapGeminiPro({
      request: {
        contents: [
          {
            parts: [
              {
                text: "What's in this image?",
              },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: imageData,
                },
              },
            ],
            role: "user",
          },
        ],
        generationConfig: {},
      },
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: "That's a screenshot of a file explorer or IDE displaying the contents of a project directory...",
                },
              ],
              role: "model",
            },
            finishReason: 1,
            avgLogprobs: -0.41642069079212307,
          },
        ],
        usageMetadata: {
          promptTokenCount: 266,
          candidatesTokenCount: 194,
          totalTokenCount: 460,
        },
      },
      statusCode: 200,
      model: "gemini-1.5-flash",
    });

    // Test request message handling
    expect(result.schema.request.messages![0]).toEqual({
      role: "user",
      content: "What's in this image?",
      _type: "image",
      image_url: imageData,
    });

    // Test response message handling
    expect(result.schema.response!.messages![0]).toEqual({
      role: "model",
      content:
        "That's a screenshot of a file explorer or IDE displaying the contents of a project directory...",
      _type: "message",
    });

    // Test preview
    expect(result.preview.request).toBe("What's in this image?");
    expect(result.preview.response).toContain(
      "That's a screenshot of a file explorer"
    );
  });

  it("should handle error responses", () => {
    const result = mapGeminiPro({
      request: {
        contents: [
          {
            parts: [{ text: "Hello" }],
            role: "user",
          },
        ],
      },
      response: {
        error: {
          message: "Invalid request",
          code: 400,
        },
      },
      statusCode: 400,
      model: "gemini-1.5-pro",
    });

    expect(result.schema.response!.error).toEqual({
      heliconeMessage: {
        message: "Invalid request",
        code: 400,
      },
    });
  });
});

describe("mapAnthropicRequest", () => {
  it("should handle system messages", () => {
    const result = mapAnthropicRequest({
      request: {
        system: "You are a helpful assistant",
        messages: [
          {
            role: "user",
            content: "Hello",
          },
        ],
      },
      response: {
        type: "message",
        role: "assistant",
        content: [
          {
            type: "text",
            text: "Hi there!",
          },
        ],
      },
      statusCode: 200,
      model: "claude-3-sonnet",
    });

    // Check system message is first in request messages
    expect(result.schema.request.messages![0]).toEqual({
      role: "system",
      content: "You are a helpful assistant",
      _type: "message",
      id: expect.any(String),
    });

    // Check user message follows
    expect(result.schema.request.messages![1]).toEqual({
      role: "user",
      content: "Hello",
      _type: "message",
    });

    // Check response message
    expect(result.schema.response!.messages![0]).toEqual({
      role: "assistant",
      content: "Hi there!",
      _type: "message",
      id: expect.any(String),
    });
  });

  it("should handle content arrays with mixed text and images", () => {
    const result = mapAnthropicRequest({
      request: {
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Page 1",
              },
              {
                type: "image_url",
                image_url: {
                  url: "data:image/1",
                },
              },
              {
                type: "text",
                text: "Page 2",
              },
              {
                type: "image_url",
                image_url: {
                  url: "data:image/2",
                },
              },
            ],
          },
        ],
      },
      response: {
        type: "message",
        role: "assistant",
        content: [
          {
            type: "text",
            text: "I see two pages",
          },
        ],
      },
      statusCode: 200,
      model: "claude-3-sonnet",
    });

    // Check request message structure
    const requestMessage = result.schema.request.messages![0];
    expect(requestMessage.content).toBe("Page 1 Page 2");
    expect(requestMessage._type).toBe("contentArray");
    expect(requestMessage.image_url).toBeUndefined();

    expect(requestMessage.contentArray).toHaveLength(4);

    // Verify content array items
    const contentArray = requestMessage.contentArray!;
    expect(contentArray[0]).toEqual({
      content: "Page 1",
      role: "user",
      _type: "message",
    });
    expect(contentArray[1]).toEqual({
      content: "",
      role: "user",
      _type: "image",
      image_url: "data:image/1",
    });
    expect(contentArray[2]).toEqual({
      content: "Page 2",
      role: "user",
      _type: "message",
    });
    expect(contentArray[3]).toEqual({
      content: "",
      role: "user",
      _type: "image",
      image_url: "data:image/2",
    });

    // Check response message
    expect(result.schema.response!.messages![0]).toEqual({
      role: "assistant",
      content: "I see two pages",
      _type: "message",
      id: expect.any(String),
    });
  });
});
