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
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-optimized.json --preset optimized
npx tsx src/cli.ts docs/bpmn-examples/risk-check-process.bpmn -o tmp/risk-base.json --preset base
npx tsx src/cli.ts docs/bpmn-examples/risk-check-process.bpmn -o tmp/risk-optimized.json --preset optimized
```

## JSON

Output является валидным JSON. Проверено командой:

```bash
jq . tmp/simple-1.json tmp/gateway-1.json tmp/loan-base.json tmp/loan-optimized.json tmp/risk-base.json tmp/risk-optimized.json >/dev/null
```

## Метрики сжатия

Метрики для примеров, сохраненных в репозитории:

| Файл | Source BPMN | Compact JSON | Коэффициент | Уменьшение |
| --- | ---: | ---: | ---: | ---: |
| `loan-application-process` / `base` | 4,855 bytes | 3,536 bytes | 1.37x | 27.2% |
| `loan-application-process` / `optimized` | 4,855 bytes | 1,120 bytes | 4.33x | 76.9% |
| `risk-check-process` / `base` | 2,872 bytes | 1,638 bytes | 1.75x | 43.0% |
| `risk-check-process` / `optimized` | 2,872 bytes | 545 bytes | 5.27x | 81.0% |

Метрики посчитаны по файлам:

```text
docs/bpmn-examples/loan-application-process.bpmn -> docs/json-examples/base/loan-application-process.json
docs/bpmn-examples/loan-application-process.bpmn -> docs/json-examples/optimized/loan-application-process.json
docs/bpmn-examples/risk-check-process.bpmn -> docs/json-examples/base/risk-check-process.json
docs/bpmn-examples/risk-check-process.bpmn -> docs/json-examples/optimized/risk-check-process.json
```

## Структура процесса

По Base JSON можно понять основную структуру процесса: процессы, элементы, события, задачи, gateway, incoming/outgoing и sequence flows с `sourceRef`/`targetRef`.

Optimized JSON сохраняет ту же смысловую нагрузку, но сжимает повторяющиеся ключи: элементы используют `meta`, включая `asyncBefore`, sequence flows записаны строками, а call activity mappings записаны через `in` и `out`.

## Техническая реализация

Технически значимая информация сохранена:

- `camunda:delegateExpression`;
- `camunda:asyncBefore` в Base JSON, когда атрибут явно задан, и `asyncBefore` в Optimized `meta`, когда значение равно `true`;
- `calledElement` у call activity;
- структурные `camunda:In` и `camunda:Out` mappings в Base JSON;
- компактные `in` и `out` mappings в формате `source->target` в Optimized JSON;
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
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-1.json --preset optimized
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-2.json --preset optimized
diff tmp/loan-1.json tmp/loan-2.json
```

`diff` пустой.

## Замечания

- `targetNamespace`, `isExecutable` и `camunda:historyTimeToLive` исключены из compact JSON по согласованному решению.
- `camunda:asyncBefore`, `camunda:asyncAfter` и `camunda:exclusive` сохраняются в Base JSON, когда явно заданы в BPMN.
- Camunda moddle descriptor подключен, чтобы runtime видел execution-related Camunda атрибуты.

## Решение

MVP принят.
