docker compose up -d
Start-Sleep -Seconds 15

# Filas
docker exec localstack awslocal sqs create-queue --queue-name package-dlq
docker exec localstack awslocal sqs create-queue --queue-name package-success

# Lambda notify-package (consome a fila de sucesso)
docker exec localstack sh -c "cd /workspace/lambdas/notify-package && python3 -m zipfile -c function.zip index.js"
docker exec localstack awslocal lambda create-function --function-name notify-package --runtime nodejs20.x --handler index.handler --role arn:aws:iam::000000000000:role/lambda-role --zip-file fileb:///workspace/lambdas/notify-package/function.zip
docker exec localstack awslocal lambda wait function-active-v2 --function-name notify-package
docker exec localstack awslocal lambda create-event-source-mapping --function-name notify-package --event-source-arn arn:aws:sqs:us-east-1:000000000000:package-success --batch-size 1

# Lambda process-package (valida o pacote)
docker exec localstack sh -c "cd /workspace/lambdas/process-package && python3 -m zipfile -c function.zip index.js validator.js sqsPublisher.js"
docker exec localstack awslocal lambda create-function --function-name process-package --runtime nodejs20.x --handler index.handler --role arn:aws:iam::000000000000:role/lambda-role --timeout 15 --zip-file fileb:///workspace/lambdas/process-package/function.zip --environment "Variables={SUCCESS_QUEUE_URL=http://localhost:4566/000000000000/package-success}"
docker exec localstack awslocal lambda wait function-active-v2 --function-name process-package
docker exec localstack awslocal lambda update-function-configuration --function-name process-package --dead-letter-config TargetArn=arn:aws:sqs:us-east-1:000000000000:package-dlq
docker exec localstack awslocal lambda put-function-event-invoke-config --function-name process-package --maximum-retry-attempts 0

# EventBridge
docker exec localstack awslocal events put-rule --name package-received-rule --event-pattern file:///workspace/events/event-pattern.json
docker exec localstack awslocal events put-targets --rule package-received-rule --targets "Id=1,Arn=arn:aws:lambda:us-east-1:000000000000:function:process-package"

# Cria TODO o ambiente do projeto com um comando só:
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1
#
# Precisa existir porque o LocalStack guarda tudo na memória: quando ele reinicia, filas, Lambdas e regras somem. Este script recria tudo.