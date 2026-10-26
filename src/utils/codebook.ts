import codebookData from "../../config/codebook_v1.json";

export interface CodebookTheme {
  id: string;
  labels: {
    en: string;
    ar: string;
  };
  seedTerms: string[];
}

export interface CodebookConfig {
  version: string;
  name: string;
  themes: CodebookTheme[];
}

export const CODEBOOK_CONFIG: CodebookConfig = codebookData as CodebookConfig;
export const CODEBOOK_VERSION: string = codebookData.version || "v1.0.0";
export const CODEBOOK_NAME: string = codebookData.name || "Jordanian Social Policy Committee Codebook v1";

export default CODEBOOK_CONFIG;
