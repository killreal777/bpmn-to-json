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
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-1.json
npx tsx src/cli.ts docs/bpmn-examples/risk-check-process.bpmn -o tmp/risk-1.json
```

## JSON

Output является валидным JSON. Проверено командой:

```bash
jq . tmp/simple-1.json tmp/gateway-1.json tmp/loan-1.json tmp/risk-1.json >/dev/null
```

## Метрики сжатия

Метрики для примеров, сохраненных в репозитории:

| Файл | Source BPMN | Compact JSON | Коэффициент | Уменьшение |
| --- | ---: | ---: | ---: | ---: |
| `loan-application-process` | 4,855 bytes | 4,150 bytes | 1.17x | 14.5% |
| `risk-check-process` | 2,872 bytes | 2,036 bytes | 1.41x | 29.1% |

Метрики посчитаны по файлам:

```text
docs/bpmn-examples/loan-application-process.bpmn -> docs/json-examples/loan-application-process.json
docs/bpmn-examples/risk-check-process.bpmn -> docs/json-examples/risk-check-process.json
```

## Структура процесса

По JSON можно понять основную структуру процесса: процессы, элементы, события, задачи, gateway, incoming/outgoing и sequence flows с `sourceRef`/`targetRef`.

## Техническая реализация

Технически значимая информация сохранена:

- `camunda:asyncBefore`, `camunda:asyncAfter`, `camunda:exclusive`;
- `camunda:delegateExpression`;
- `calledElement` у call activity;
- `camunda:In` и `camunda:Out` mappings;
- условия sequence flow для gateway.

## Layout-информация

BPMNDI/DI/DC/layout-информация в JSON не обнаружена. Проверено командой:

```bash
rg "BPMNDiagram|BPMNPlane|BPMNShape|BPMNEdge|Bounds|waypoint|bpmndi|dc:|di:|width|height|targetNamespace|isExecutable|historyTimeToLive" tmp/*.json
```

Команда не нашла совпадений.

## Детерминированность

Повторный запуск дал идентичный JSON:

```bash
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-1.json
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-2.json
diff tmp/loan-1.json tmp/loan-2.json
```

`diff` пустой.

## Замечания

- `targetNamespace`, `isExecutable` и `camunda:historyTimeToLive` исключены из compact JSON по согласованному решению.
- Camunda moddle descriptor подключен, чтобы runtime видел execution-related Camunda атрибуты.

## Решение

MVP принят.
