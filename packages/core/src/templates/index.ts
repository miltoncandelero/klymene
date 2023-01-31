// List the templates
import jsonhash from "./jsonhash.hbs";

export const TEMPLATES: Record<string, TemplateData> = {
	jsonhash: { templateString: jsonhash, templateFunction: undefined, templateExtension: "json" },
};

export interface TemplateData {
	templateString: string;
	templateFunction: HandlebarsTemplateDelegate<any> | undefined;
	templateExtension: string;
}
