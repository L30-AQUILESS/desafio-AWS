// =====================================================================
// validator.test.js
// Testes unitários do validator.js.
//
// Para que serve: provar que a função validatePackage detecta cada tipo
// de erro de um pacote (e que um pacote bom não gera erro nenhum).
// =====================================================================

// Importa o executor de testes que já vem dentro do Node 
// A função "test" define cada teste.
const test = require('node:test');
// Importa as conferências (assert). Se uma conferência falha, o teste falha e o Node mostra um ✖ com a explicação.
const assert = require('node:assert');
// Importa a função que será testada, do arquivo validator.js (o "./"significa "na mesma pasta que este arquivo").
const { validatePackage } = require('./validator');

// Monta um pacote VÁLIDO, igual ao PKG-1001 do enunciado. 
const validDetail = () => ({
  packageId: 'PKG-1001',
  customerId: 'CUST-500',
  warehouseId: 'WH-01',
  items: [
    { sku: 'SKU-123', quantity: 2 },
    { sku: 'SKU-456', quantity: 1 },
  ],
  status: 'NEW',
});
// Um pacote válido não pode gerar nenhum erro. A validação devolve uma lista de erros, e lista vazia ([]) significa "pacote válido".
test('pacote válido não gera erros', () => {
  assert.deepStrictEqual(validatePackage(validDetail()), []);
});
// Pega o pacote válido e troca só a lista de itens por uma lista vazia.
test('lista de itens vazia gera erro', () => {
  const detail = { ...validDetail(), items: [] };
  assert.ok(validatePackage(detail).includes('lista de itens vazia'));
});
//campo obrigatório faltando.
test('campo obrigatório ausente gera erro', () => {
  const detail = validDetail();
    // "delete" remove o campo customerId só desta cópia do pacote.
  delete detail.customerId;
  // A mensagem inclui o nome do campo que faltou.
  assert.ok(validatePackage(detail).includes('campo obrigatório ausente: customerId'));
});
// Troca os itens por um único item com quantidade zero (o validator exige um número inteiro maior que zero).
test('quantidade zero gera erro', () => {
  const detail = { ...validDetail(), items: [{ sku: 'SKU-1', quantity: 0 }] };
  assert.ok(validatePackage(detail).includes('item 0: quantidade inválida'));
});
//O único item da lista tem quantidade, mas não tem o campo sku.
test('item sem sku gera erro', () => {
  const detail = { ...validDetail(), items: [{ quantity: 1 }] };
  assert.ok(validatePackage(detail).includes('item 0: sku ausente'));
});
// Se o evento chegar sem o campo detail, a validação não pode quebrar: ela devolve um erro explicando o problema
test('detail ausente gera erro', () => {
  assert.deepStrictEqual(validatePackage(undefined), ['detail ausente']);
});