# Desafio: fluxo de processamento de pacotes (AWS local)

Simulação, com LocalStack, de um fluxo orientado a eventos: um pacote chega, uma Lambda valida os dados e, conforme o resultado, o fluxo segue para a fila de sucesso ou para a fila de erro (DLQ).

## Arquitetura

```
EventBridge     --->     process-package    --->    package-success    --->   notify-package
recebe o evento 	       valida o pacote    	      fila de sucesso          escreve o log     
				                        |
    			                      |
				                        \
			                    	package-dlq
				                    fila de erro
```

- **EventBridge**: regra `package-received-rule` captura `source: com.empresa.warehouse` e `detail-type: PackageReceived`.
- **process-package**: valida o pacote. Se válido, publica na fila `package-success`. Se inválido, lança erro.
- **package-dlq**: DLQ configurada na própria Lambda `process-package` (sem retentativas), então o evento que falhou vai para ela.
- **notify-package**: consome `package-success` e registra `Pacote X processado!`.

## Pré-requisitos

- Docker Desktop em execução
- PowerShell (o script de setup é `.ps1`, feito para Windows)

Não é preciso conta AWS nem credenciais reais.

## Como subir o ambiente

```bash
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

O script sobe o LocalStack, cria as filas, as duas Lambdas, a regra do EventBridge e a DLQ. Leva cerca de 1 minuto. O LocalStack não guarda estado, então rode o script de novo sempre que o container for reiniciado.

Os comandos `awslocal` são executados dentro do container (`docker exec localstack awslocal ...`).

## Como testar

**Pacote válido (PKG-1001):**

```bash
docker exec localstack awslocal events put-events --entries file:///workspace/events/put-valido.json
```

docker exec localstack: executa o que vem depois dentro do container do LocalStack.
awslocal: a ferramenta de comandos da AWS, já apontada para o LocalStack.
events: o serviço da AWS que vamos usar. Na AWS, o EventBridge se chama events na linha de comando.
put-events: a operação “publicar eventos”. É o equivalente a colocar uma carta na caixa do correio.
--entries file:///workspace/events/put-valido.json: diz quais eventos publicar. 
O file:// significa “leia o conteúdo deste arquivo”. 
O caminho /workspace/... é o de dentro do container, que corresponde à pasta events do seu projeto (é o volume do docker-compose.yml).

** A respeito do put-valido.jason está no arquivo "put-valido.jason.md"

## O que acontece quando o Enter é apertado para esse comando do put-events:

O EventBridge recebe o evento na caixa de entrada padrão dele (o “default event bus”) e completa o que faltava: um id, a hora, a conta, a região. Aí o evento fica igual ao do enunciado.
Ele compara o evento com as regras. A nossa, package-received-rule, diz “quero eventos com Source igual a com.empresa.warehouse e DetailType igual a PackageReceived”. O evento bate.
Ele aciona o alvo da regra, que é a process-package, entregando o evento completo. Essa chamada é assíncrona: o EventBridge entrega e já volta, sem esperar a função terminar.
A process-package roda em segundo plano. Daí em diante, o caminho depende dos dados:
Pacote válido: a função publica o pacote na fila package-success. A notify-package é acionada e escreve o log.
Pacote inválido: a função lança um erro e o evento original vai para a package-dlq


Espere cerca de 20 segundos e consulte o log da segunda Lambda:

```bash
docker exec localstack awslocal logs describe-log-streams --log-group-name /aws/lambda/notify-package
docker exec localstack awslocal logs get-log-events --log-group-name /aws/lambda/notify-package --log-stream-name '<logStreamName>'
```

Esperado: `Pacote PKG-1001 processado!`

**Pacote inválido (PKG-1002, lista de itens vazia):**

```bash
docker exec localstack awslocal events put-events --entries file:///workspace/events/put-invalido.json
```
## O que acontece, em ordem
1. O put-events publica o evento, como no passo 4. O EventBridge aceita e responde FailedEntryCount: 0.
2. A regra bate (Source e DetailType são os mesmos) e o EventBridge aciona a process-package.
3. O validator.js roda. O validatePackage confere os campos obrigatórios (todos presentes) e depois confere os itens. Como items é uma lista vazia, ele devolve ['lista de itens vazia'].
4. O handler vê que a lista de erros não está vazia. Dentro do index.js do process-package o console.error escreve o motivo no log, e o throw new Error faz a execução falhar. O publishToSuccessQueue nunca chega a ser chamado, então nada vai para a fila de sucesso.
5. A falha aciona a DLQ. Como a chamada do EventBridge é assíncrona, quando a Lambda falha a AWS decide o que fazer com o evento. Configuramos duas coisas na process-package: maximum-retry-attempts 0 (não tenta de novo) e DeadLetterConfig apontando para a package-dlq. Então o evento original, inteiro, é enviado para essa fila.
6. A notify-package não é acionada, porque a fila de sucesso nunca recebeu nada. Por isso não aparece log novo dela.

Espere cerca de 20 segundos e consulte a fila de erro:

```bash
docker exec localstack awslocal sqs receive-message --queue-url http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/package-dlq
```
docker exec localstack awslocal: roda o comando dentro do LocalStack, como nos outros.
sqs: o serviço de filas.
receive-message: “receber mensagem”. Pede à fila uma mensagem que esteja esperando.
--queue-url ...: diz de qual fila ler.  

Esperado: uma mensagem com o evento do PKG-1002, e nenhum log novo na `notify-package`.

## O que aparece como resultado:

{
    "Messages": [
        {
            "MessageId": "284e5c3f-a5a7-43da-a10d-f3ace2dd0b08",
            "ReceiptHandle": "YzVmYTQyMjQtYmQzZi00ZDgzLWJkOWUtMGVmZGJiMTQwZmRhIGFybjphd3M6c3FzOnVzLWVhc3QtMTowMDAwMDAwMDAwMDA6cGFja2FnZS1kbHEgMjg0ZTVjM2YtYTVhNy00M2RhLWExMGQtZjNhY2UyZGQwYjA4IDE3OTI5NTQ5MTIuNDUxMTQ0",
            "MD5OfBody": "502ebfc7c765bd18a4a3dc28c8163dd1",
            "Body": "{\"version\": \"0\", \"id\": \"5702f3a9-1ef7-4c4c-b65c-a4105ad4d805\", \"detail-type\": \"PackageReceived\", \"source\": \"com.empresa.warehouse\", \"account\": \"000000000000\", \"time\": \"2026-10-25T18:26:57Z\", \"region\": \"us-east-1\", \"resources\": [], \"detail\": {\"packageId\": \"PKG-1002\", \"customerId\": \"CUST-501\", \"warehouseId\": \"WH-01\", \"items\": [], \"status\": \"NEW\"}}"
        }
    ]
}

## Significado
MessageId: o identificador da mensagem na fila.
ReceiptHandle: um “recibo” que serve para apagar a mensagem depois, e você não precisa dele aqui.
MD5OfBody: uma assinatura do conteúdo, para conferir que ele não foi alterado.
Body: o que importa. É o evento original inteiro que a Lambda recusou, em texto. Dentro dele você vê "packageId": "PKG-1002" e "items": []. Isso é a prova de que o pacote inválido foi parar ali.

## Regras de validação (`validator.js`)

- `packageId`, `customerId` e `warehouseId` são obrigatórios
- `items` deve ser uma lista não vazia
- cada item precisa de `sku` e de `quantity` inteira maior que zero

## Estrutura

```
docker-compose.yml        LocalStack
setup.ps1                 cria todos os recursos
events/                   eventos de teste e padrão da regra
lambdas/process-package/
  index.js                handler (só orquestra)
  validator.js            regras de validação (função pura)
  sqsPublisher.js         integração com o SQS
lambdas/notify-package/
  index.js                handler (log)
```

## Decisões

- **DLQ na Lambda, não na regra do EventBridge**: a DLQ da regra só cobre falhas de entrega do evento. Como a falha aqui acontece dentro da função (dado inválido), configurei a DLQ na Lambda, com `maximum-retry-attempts 0` para o evento ir direto para a fila de erro.
- **LocalStack 4.4 fixado**: as versões novas da imagem exigem token de autenticação, então a versão foi fixada para rodar sem conta.
- **Código separado por responsabilidade**: validação, integração com a AWS e handler ficam em arquivos distintos.