# Приемка BPMN XML -> JSON converter

## Проверенные файлы

1. `test/fixtures/simple-linear.bpmn` - принято
2. `test/fixtures/gateway-condition.bpmn` - принято
3. `docs/bpmn-examples/loan-application-process.bpmn` - принято
4. `docs/bpmn-examples/risk-check-process.bpmn` - принято

## Запуск

Команды выполнены успешно:

```bash
npx tsx src/cli.ts test/fixtures/simple-linear.bpmn -o tmp/simple-1.json
npx tsx src/cli.ts test/fixtures/gateway-condition.bpmn -o tmp/gateway-1.json
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-base.json --preset base
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-max.json --preset max
npx tsx src/cli.ts docs/bpmn-examples/risk-check-process.bpmn -o tmp/risk-base.json --preset base
npx tsx src/cli.ts docs/bpmn-examples/risk-check-process.bpmn -o tmp/risk-max.json --preset max
```

## JSON

Output является валидным JSON. Проверено командой:

```bash
jq . tmp/simple-1.json tmp/gateway-1.json tmp/loan-base.json tmp/loan-max.json tmp/risk-base.json tmp/risk-max.json >/dev/null
```

## Метрики сжатия

Метрики для примеров, сохраненных в репозитории:

| Файл | Source BPMN | Compact JSON | Коэффициент | Уменьшение |
| --- | ---: | ---: | ---: | ---: |
| `loan-application-process` / `base` | 4,855 bytes | 3,006 bytes | 1.62x | 38.1% |
| `loan-application-process` / `max` | 4,855 bytes | 1,843 bytes | 2.63x | 62.0% |
| `risk-check-process` / `base` | 2,872 bytes | 1,597 bytes | 1.80x | 44.4% |
| `risk-check-process` / `max` | 2,872 bytes | 872 bytes | 3.29x | 69.6% |

Метрики посчитаны по файлам:

```text
docs/bpmn-examples/loan-application-process.bpmn -> docs/json-examples/base/loan-application-process.json
docs/bpmn-examples/loan-application-process.bpmn -> docs/json-examples/max/loan-application-process.json
docs/bpmn-examples/risk-check-process.bpmn -> docs/json-examples/base/risk-check-process.json
docs/bpmn-examples/risk-check-process.bpmn -> docs/json-examples/max/risk-check-process.json
```

## Структура процесса

По JSON можно понять основную структуру процесса: процессы, элементы, события, задачи, gateway, incoming/outgoing и sequence flows с `sourceRef`/`targetRef`.

## Техническая реализация

Технически значимая информация сохранена:

- `camunda:delegateExpression`;
- `calledElement` у call activity;
- компактные `camunda:In` и `camunda:Out` mappings в формате `source->target`;
- условия sequence flow для gateway.

## Layout-информация

BPMNDI/DI/DC/layout-информация в JSON не обнаружена. Проверено командой:

```bash
rg "BPMNDiagram|BPMNPlane|BPMNShape|BPMNEdge|Bounds|waypoint|bpmndi|dc:|di:|width|height|targetNamespace|isExecutable|historyTimeToLive|asyncBefore|asyncAfter|exclusive" tmp/*.json
```

Команда не нашла совпадений.

## Детерминированность

Повторный запуск дал идентичный JSON:

```bash
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-1.json --preset max
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-2.json --preset max
diff tmp/loan-1.json tmp/loan-2.json
```

`diff` пустой.

## Замечания

- `targetNamespace`, `isExecutable`, `camunda:historyTimeToLive`, `camunda:asyncBefore`, `camunda:asyncAfter` и `camunda:exclusive` исключены из compact JSON по согласованному решению.
- Camunda moddle descriptor подключен, чтобы runtime видел execution-related Camunda атрибуты.

## Решение

MVP принят.
