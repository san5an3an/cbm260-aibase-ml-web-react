import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const parentRelativeImport = {
  regex: "^\\.\\./",
  message: "다른 폴더의 파일은 '@/' 경로로 import",
};

// 폴더별 import 제한 경로 지정
function restrictImports(files, blockedFolders, message, extraPatterns = []) {
  return {
    files,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            parentRelativeImport,
            { regex: `^@/(${blockedFolders.join("|")})(/|$)`, message },
            ...extraPatterns,
          ],
        },
      ],
    },
  };
}

const upperLayerMessage =
  "이 Layer에서는 상위 Layer와 domain, config, services를 import할 수 없음. Layer 순서는 ui, atoms, molecules, organisms, templates, pages";
const dataAccessMessage =
  "데이터 연결은 components/pages에서만 처리. 이 Layer는 props로 값을 받음";

const pixelUnitMessage =
  "길이는 rem으로 표기. px ÷ 16으로 변환, 예: 14px은 0.875rem";
const pixelClassMessage =
  "이 Tailwind class는 px로 고정됨. rem 값으로 표기, 예: border-2는 border-[0.125rem], w-px는 w-[0.0625rem]";
const pixelClassPattern =
  "(^|[ :])(border(-[xytrblse])?-[1-9][0-9]*|(w|h|size|min-w|min-h|max-w|max-h)-px|ring-[1-9][0-9]*|outline-[1-9][0-9]*|shadow-(2xs|xs|sm|md|lg|xl|2xl)|divide-[xy](-[1-9][0-9]*)?)( |$)";

// 프로젝트 코드의 px 단위 사용 제한
const remOnlyRule = {
  files: ["src/**/*.{ts,tsx}"],
  ignores: ["src/components/ui/**"],
  rules: {
    "no-restricted-syntax": [
      "error",
      { selector: "Literal[value=/[0-9]px([^a-z]|$)/]", message: pixelUnitMessage },
      { selector: "TemplateElement[value.raw=/[0-9]px([^a-z]|$)/]", message: pixelUnitMessage },
      { selector: `Literal[value=/${pixelClassPattern}/]`, message: pixelClassMessage },
      { selector: `TemplateElement[value.raw=/${pixelClassPattern}/]`, message: pixelClassMessage },
    ],
  },
};

const dataValueMessage =
  "이 Layer는 domain, config에서 Type(import type)과 고정 표기(@/domain/labels)만 import. 데이터는 props로 받음";

// 화면 Component가 domain, config 값을 직접 import하지 못하도록 제한
const dataValuePatterns = [
  { regex: "^@/domain(/(?!labels/)|$)", allowTypeImports: true, message: dataValueMessage },
  { regex: "^@/config(/|$)", allowTypeImports: true, message: dataValueMessage },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  remOnlyRule,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [parentRelativeImport] }],
    },
  },
  restrictImports(
    ["src/components/ui/**"],
    [
      "components/atoms",
      "components/molecules",
      "components/organisms",
      "components/templates",
      "components/pages",
      "domain",
      "config",
      "services",
      "app",
    ],
    upperLayerMessage,
  ),
  restrictImports(
    ["src/components/atoms/**"],
    [
      "components/molecules",
      "components/organisms",
      "components/templates",
      "components/pages",
      "domain",
      "config",
      "services",
      "app",
    ],
    upperLayerMessage,
  ),
  restrictImports(
    ["src/components/molecules/**"],
    [
      "components/organisms",
      "components/templates",
      "components/pages",
      "domain",
      "config",
      "services",
      "app",
    ],
    upperLayerMessage,
  ),
  restrictImports(
    ["src/components/organisms/**"],
    ["components/templates", "components/pages", "services", "app"],
    dataAccessMessage,
    dataValuePatterns,
  ),
  restrictImports(
    ["src/components/templates/**"],
    ["components/pages", "services", "app"],
    dataAccessMessage,
    dataValuePatterns,
  ),
  restrictImports(
    ["src/components/pages/**"],
    ["services/mock"],
    "Mock 데이터는 services의 조회 함수를 통해서만 사용",
  ),
  restrictImports(
    ["src/domain/**", "src/config/**"],
    ["components", "services", "app"],
    "domain, config는 화면과 데이터 연결을 import할 수 없음",
  ),
  restrictImports(
    ["src/lib/**"],
    ["components", "services", "app", "domain", "config"],
    "lib은 화면, 데이터 연결, domain, config를 import할 수 없음",
  ),
  restrictImports(
    ["src/services/**"],
    ["components", "app"],
    "services는 화면을 import할 수 없음",
  ),
  // shadcn이 설치한 파일은 수정하지 않으므로 해당 파일에 걸리는 규칙 제외
  {
    files: ["src/hooks/use-mobile.ts"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
