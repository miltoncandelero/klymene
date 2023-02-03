export declare const TEMPLATES: Record<string, TemplateData>;
export interface TemplateData {
    templateString: string;
    templateFunction: HandlebarsTemplateDelegate<any> | undefined;
    templateExtension: string;
}
