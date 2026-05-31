declare module 'bpmn-moddle' {
  export type BpmnModdleWarning = {
    message?: string;
  };

  export type FromXmlResult = {
    rootElement: unknown;
    references: unknown[];
    warnings: BpmnModdleWarning[];
    elementsById: Record<string, unknown>;
  };

  export default class BpmnModdle {
    constructor(packages?: Record<string, unknown>);
    fromXML(xml: string): Promise<FromXmlResult>;
  }
}
