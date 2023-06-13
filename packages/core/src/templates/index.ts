// List the templates
import jsonhash from "./jsonhash.hbs";
import { TemplateDelegate } from "handlebars";

export const TEMPLATES: Record<string, TemplateData> = {
	jsonhash: { templateString: jsonhash, templateFunction: undefined, templateExtension: "json" },
};

export interface TemplateData {
	templateString: string;
	templateFunction: TemplateDelegate<any> | undefined;
	templateExtension: string;
}
