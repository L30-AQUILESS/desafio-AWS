// =====================================================================
// notify-package / index.js
// Segunda Lambda do fluxo. Ela só CONFIRMA o processamento: lê cada pacote que chegou na fila de sucesso (package-success) e escreve no log "Pacote X processado!".
// Quem a aciona é a FILA, e não a process-package: quando uma mensagem chega em package-success, o event source mapping (criado no setup.ps1) chama esta função automaticamente.
// =====================================================================

// "exports.handler" exporta a função de entrada da Lambda (o handler).
// "event" é o argumento que a Lambda recebe, com os dados que a acionaram. Aqui é um lote de mensagens vindas do SQS.
// "async" faz a função devolver uma promessa, que é o formato que a Lambda espera de um handler assíncrono. Neste arquivo não há nenhum "await" porque nada demorado é esperado: só se escreve no log.
exports.handler = async (event) => { 
  // O SQS entrega as mensagens em "event.Records" (uma lista).
  // Com --batch-size 1, a lista tem uma mensagem por execução, mas o "for" cobre qualquer tamanho de lote.
  for (const record of event.Records) {
    // "record.body" é o conteúdo da mensagem, em TEXTO. Foi a process-package que o escreveu com JSON.stringify.
    // O JSON.parse faz o caminho de volta: transforma o texto em objeto, para conseguir ler os campos (como pkg.packageId).
    const pkg = JSON.parse(record.body);
    // Escreve no log da Lambda (CloudWatch Logs). É a linha que aparece no get-log-events e que prova que o pacote foi processado.
    // A crase (`) permite colocar o valor de uma variável dentro do texto com ${...}.
    console.log(`Pacote ${pkg.packageId} processado!`);
  }
};
