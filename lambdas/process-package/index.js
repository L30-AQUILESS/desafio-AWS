// =====================================================================
// Primeira Lambda do fluxo. Ela recebe o evento do EventBridge, valida o pacote e decide o caminho:
//   - pacote VÁLIDO   -> publica na fila package-success
//   - pacote INVÁLIDO -> lança um erro, e o evento vai para a package-dlq
// Este arquivo só coordena. A regra de validação fica no validator.js, e a comunicação com a fila fica no sqsPublisher.js.
// =====================================================================
const { validatePackage } = require('./validator'); // Importa a função que valida o pacote (arquivo validator.js, mesma pasta).
const { publishToSuccessQueue } = require('./sqsPublisher'); // Importa a função que envia o pacote para a fila de sucesso (arquivo sqsPublisher.js, mesma pasta).
// Handler: a função de entrada da Lambda. Foi registrada no create-function com --handler index.handler (arquivo "index", função "handler").
//
// "event" é o evento completo do EventBridge (version, id, source, detail-type, time, detail...). Os dados do pacote ficam em event.detail.
//
// "async" é necessário porque a função espera (await) o envio para a fila.
exports.handler = async (event) => {
  const errors = validatePackage(event.detail); //Chama a validação passando só os dados do pacote. ; Ela devolve uma LISTA de erros: lista vazia significa pacote válido.

  if (errors.length > 0) {// Se a lista tem algum erro, o pacote é inválido ; 
    console.error('Pacote inválido:', errors); //Escreve o motivo no log da Lambda (aparece como ERROR no CloudWatch).
    throw new Error(`Pacote inválido: ${errors.join('; ')}`); //Lançar um erro faz a execução FALHAR. Essa falha é o que leva o evento original para a DLQ
  }

  await publishToSuccessQueue(event.detail); //O "await" espera o envio terminar antes de seguir para a próxima linha para verificar se ele foi válido 
  console.log(`Pacote ${event.detail.packageId} enviado para a fila de sucesso`); //Registra no log que o pacote foi enviado.
};