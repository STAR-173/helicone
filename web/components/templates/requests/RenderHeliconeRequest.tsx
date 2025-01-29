import { HeliconeRequest } from "@/lib/api/request/request";
import { MappedLLMRequest } from "@/packages/llm-mapper/types";
import { getMappedContent } from "@/packages/llm-mapper/utils/getMappedContent";
import { getMapperTypeFromHeliconeRequest } from "@/packages/llm-mapper/utils/getMapperType";
import { useMemo } from "react";
import { Chat } from "./components/chatComponent/chat";
import { Completion } from "./components/completion";

type RenderMappedRequestProps = {
  selectedProperties?: Record<string, string>;
  editable?: boolean;
  isHeliconeTemplate?: boolean;
  hideTopBar?: boolean;
  messageSlice?: "lastTwo";
  className?: string;
  autoInputs?: any[];
};

const VectorDB = ({ mappedRequest }: { mappedRequest: MappedLLMRequest }) => {
  const { schema } = mappedRequest;
  const isError = mappedRequest.heliconeMetadata.status.code >= 400;

  return (
    <div className="w-full flex flex-col text-left space-y-4 text-sm">
      <div className="w-full flex flex-col text-left space-y-1">
        <p className="font-semibold text-gray-900">Request</p>
        <div className="p-2 border border-gray-300 bg-gray-50 rounded-md whitespace-pre-wrap">
          {mappedRequest.preview.request}
        </div>
      </div>
      <div className="w-full flex flex-col text-left space-y-1">
        <p className="font-semibold text-gray-900">
          {isError ? "Error" : "Response"}
        </p>
        <div
          className={`p-2 border border-gray-300 ${
            isError ? "bg-red-50" : "bg-green-50"
          } rounded-md whitespace-pre-wrap`}
        >
          {mappedRequest.preview.response}
        </div>
      </div>
      {schema.response?.messages?.[0]?.content && !isError && (
        <div className="w-full flex flex-col text-left space-y-1">
          <p className="font-semibold text-gray-900">Details</p>
          <div className="p-2 border border-gray-300 bg-gray-50 rounded-md whitespace-pre-wrap">
            {schema.response.messages[0].content}
          </div>
        </div>
      )}
    </div>
  );
};

const Tool = ({ mappedRequest }: { mappedRequest: MappedLLMRequest }) => {
  const { schema, raw } = mappedRequest;
  const isError = mappedRequest.heliconeMetadata.status.code >= 400;

  return (
    <div className="w-full flex flex-col text-left space-y-4 text-sm">
      <div className="w-full flex flex-col text-left space-y-1">
        <p className="font-semibold text-gray-900">Tool Request</p>
        <div className="p-2 border border-gray-300 bg-gray-50 rounded-md whitespace-pre-wrap">
          {mappedRequest.preview.request}
        </div>
      </div>
      <div className="w-full flex flex-col text-left space-y-1">
        <p className="font-semibold text-gray-900">
          {isError ? "Error" : "Summary"}
        </p>
        <div
          className={`p-2 border border-gray-300 ${
            isError ? "bg-red-50" : "bg-green-50"
          } rounded-md whitespace-pre-wrap`}
        >
          {mappedRequest.preview.response}
        </div>
      </div>
      {!isError && raw.response && (
        <div className="w-full flex flex-col text-left space-y-1">
          <p className="font-semibold text-gray-900">Full Response</p>
          <div className="p-2 border border-gray-300 bg-gray-50 rounded-md whitespace-pre-wrap overflow-auto max-h-96">
            {JSON.stringify(raw.response, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
};

export const RenderMappedRequest = (
  props: RenderMappedRequestProps & { mapperContent: MappedLLMRequest }
) => {
  const { mapperContent } = props;
  if ([0, null].includes(mapperContent?.heliconeMetadata?.status?.code)) {
    return <p>Pending...</p>;
  } else if (
    mapperContent._type === "openai-chat" ||
    mapperContent._type === "gemini-chat" ||
    mapperContent._type === "anthropic-chat" ||
    mapperContent._type === "openai-image" ||
    mapperContent._type === "black-forest-labs-image"
  ) {
    if (
      mapperContent.heliconeMetadata.status.code >= 200 &&
      mapperContent.heliconeMetadata.status.code < 300
    ) {
      return (
        <>
          <Chat mappedRequest={mapperContent} {...props} />
        </>
      );
    } else {
      return (
        <div className="w-full flex flex-col text-left space-y-8 text-sm">
          {mapperContent?.schema.request?.messages &&
            JSON.stringify(mapperContent?.schema.request?.messages, null, 2)}
          <div className="w-full flex flex-col text-left space-y-1 text-sm">
            <p className="font-semibold text-gray-900 text-sm">Error</p>
            <p className="p-2 border border-gray-300 bg-gray-100 rounded-md whitespace-pre-wrap h-full leading-6 overflow-auto">
              {mapperContent?.schema.response?.error?.heliconeMessage ||
                "An unknown error occurred."}
            </p>
          </div>
        </div>
      );
    }
  } else if (
    mapperContent._type === "openai-instruct" ||
    mapperContent._type === "openai-embedding"
  ) {
    if (
      mapperContent.heliconeMetadata.status.code >= 200 &&
      mapperContent.heliconeMetadata.status.code < 300
    ) {
      return <Completion mappedRequest={mapperContent} />;
    } else {
      return (
        <div className="w-full flex flex-col text-left space-y-8 text-sm">
          <div className="w-full flex flex-col text-left space-y-1 text-sm">
            <p className="font-semibold text-gray-900 text-sm">Error</p>
            <p className="p-2 border border-gray-300 bg-gray-100 rounded-md whitespace-pre-wrap h-full leading-6 overflow-auto">
              {mapperContent?.schema.response?.error?.heliconeMessage ||
                "An unknown error occurred."}
            </p>
          </div>
        </div>
      );
    }
  } else if (mapperContent._type === "vector-db") {
    return <VectorDB mappedRequest={mapperContent} />;
  } else if (mapperContent._type === "tool") {
    return <Tool mappedRequest={mapperContent} />;
  }
  return (
    <>
      <div className="text-sm text-gray-500">
        Unable to render this request. Please contact support at
        (support@helicone.ai) and we can be sure to add support for it. Or if
        you feel inclined, you can submit a PR to add support for it.
      </div>
      <pre>
        <code>{JSON.stringify(mapperContent, null, 2)}</code>
      </pre>
    </>
  );
};

export const RenderHeliconeRequest = (
  props: RenderMappedRequestProps & { heliconeRequest: HeliconeRequest }
) => {
  const { heliconeRequest } = props;
  const mapped = useMemo(() => {
    const mapperType = getMapperTypeFromHeliconeRequest(
      heliconeRequest,
      heliconeRequest.model
    );
    const content = getMappedContent({
      mapperType,
      heliconeRequest,
    });
    return {
      content,
      mapperType,
    };
  }, [heliconeRequest]);

  if (!mapped.content) {
    return <p>No mapped content</p>;
  }
  return <RenderMappedRequest {...props} mapperContent={mapped.content} />;
};
