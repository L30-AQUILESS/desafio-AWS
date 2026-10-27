// sqsPublisher.js
// Único arquivo que fala com a AWS (SQS). Tem uma função só: enviar o pacote válido para a fila package-success.

const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs'); // Importa do SDK da AWS o "cliente" do SQS (quem conversa com o serviço) e o comando de enviar mensagem

// Endereço do serviço. Dentro da Lambda, "localhost" seria a própria Lambda e não o LocalStack, então o LocalStack informa onde ele está por variáveis de ambiente. A ordem de escolha é:
//   1. AWS_ENDPOINT_URL, se existir;
//   2. senão, monta o endereço com LOCALSTACK_HOSTNAME, se existir;
//   3. senão, fica undefined: o SDK usa o endereço padrão da AWS real.
const endpoint =
  process.env.AWS_ENDPOINT_URL ||
  (process.env.LOCALSTACK_HOSTNAME
    ? `http://${process.env.LOCALSTACK_HOSTNAME}:4566`
    : undefined);

const client = new SQSClient({ endpoint }); // Cria o cliente uma vez só, fora da função. Assim ele é reaproveitado nas próximas execuções da Lambda, em vez de ser recriado toda vez.

async function publishToSuccessQueue(pkg) { // Envia o pacote para a fila de sucesso. É "async" porque a chamada a fila é assíncrona, e quem a usa (index.js) espera o término com "await"
  await client.send(new SendMessageCommand({
    QueueUrl: process.env.SUCCESS_QUEUE_URL, //URL da fila de destino 
    MessageBody: JSON.stringify(pkg), // O corpo de uma mensagem SQS precisa ser TEXTO
  }));
}

module.exports = { publishToSuccessQueue }; //Disponibiliza a função para outros arquivos, o index.js consegue usar a função publishToSuccessQueue que foi escrita em outro arquivo (o sqsPublisher.js).